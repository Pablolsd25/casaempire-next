import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { validateCoupon } from '@/lib/coupons'
import { SHIPPING_COST } from '@/lib/constants'
import { fulfillPaidOrder } from '@/lib/checkout-fulfillment'
import { getOpenPayError } from '@/lib/openpay-errors'
import { buildOpenPayChargeBody, isFallbackDeviceSessionId } from '@/lib/openpay-charge'
import { isOpenPaySandbox } from '@/lib/openpay-env'
import { openpayFetch, getOpenPayApi } from '@/lib/openpay-server'
import { getPublicSiteOrigin, isLocalOrigin } from '@/lib/site-origin'
import {
  validateCheckoutCustomer,
  validateCheckoutItems,
  validateClientAmount,
} from '@/lib/checkout-validation'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/checkout
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const rate = await checkRateLimit('checkout', req)
    if (!rate.success) {
      return NextResponse.json(
        { error: 'Demasiados intentos de pago. Intenta más tarde.' },
        { status: 429, headers: rateLimitHeaders(rate) }
      )
    }

    const body = await req.json()
    const {
      token, deviceSessionId, idempotencyKey,
      amount, items, customer, shippingAddress, couponCode,
      openpaySandbox,
    } = body

    if (!token || !amount || !items?.length) {
      return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 })
    }

    if (!deviceSessionId?.trim()) {
      return NextResponse.json(
        { error: 'El sistema antifraude no está listo. Recarga la página e intenta de nuevo.' },
        { status: 400 }
      )
    }

    const customerResult = validateCheckoutCustomer(customer)
    if (!customerResult.ok) {
      return NextResponse.json({ error: customerResult.error }, { status: 400 })
    }
    const validatedCustomer = customerResult.customer

    const serverSandbox = isOpenPaySandbox()
    const clientSandbox = openpaySandbox === true

    if (clientSandbox !== serverSandbox) {
      console.error(
        '[checkout] OpenPay ambiente desincronizado — cliente sandbox:',
        clientSandbox,
        '| servidor sandbox:',
        serverSandbox,
        '| API:',
        getOpenPayApi()
      )
      return NextResponse.json(
        {
          error:
            'El pago no pudo procesarse por un problema de configuración. Intenta más tarde o contáctanos.',
        },
        { status: 500 }
      )
    }

    if (!serverSandbox && isFallbackDeviceSessionId(deviceSessionId)) {
      return NextResponse.json(
        {
          error:
            'No se pudo inicializar la verificación antifraude. Recarga la página, espera unos segundos e intenta de nuevo.',
        },
        { status: 400 }
      )
    }

    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    const profileId = user?.id ?? null

    const supabase = createAdminClient()

    const itemValidation = await validateCheckoutItems(supabase, items)
    if (!itemValidation.ok) {
      return NextResponse.json({ error: itemValidation.error }, { status: 400 })
    }

    const validatedItems = itemValidation.items
    const subtotal = itemValidation.subtotal

    const { data: shippingSetting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'shipping_cost')
      .single()
    const globalShippingCost = shippingSetting ? parseFloat(shippingSetting.value) : SHIPPING_COST

    let discount = 0
    let freeShipping = false
    let validCouponCode: string | null = null
    if (couponCode) {
      const result = await validateCoupon(supabase, couponCode, subtotal)
      if (result.valid) {
        discount = result.discount
        freeShipping = result.freeShipping
        validCouponCode = result.coupon?.code ?? null
      }
    }

    const productIds = validatedItems.map((i) => i.productId)
    const { data: productShipping } = await supabase
      .from('products')
      .select('id, shipping_cost')
      .in('id', productIds)
    const shippingMap = new Map(
      (productShipping ?? []).map((p: { id: string; shipping_cost: number | null }) => [p.id, p.shipping_cost])
    )
    const itemShippingCosts = validatedItems.map(
      (i) => shippingMap.get(i.productId) ?? globalShippingCost
    )
    const shippingCost = freeShipping ? 0 : Math.max(...itemShippingCosts)
    const total = Math.max(0, subtotal - discount + shippingCost)

    const amountError = validateClientAmount(amount, total)
    if (amountError) {
      return NextResponse.json({ error: amountError }, { status: 400 })
    }

    if (idempotencyKey) {
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id, status, openpay_transaction_id')
        .eq('idempotency_key', idempotencyKey)
        .single()

      if (existingOrder) {
        console.log('[checkout] Orden duplicada detectada:', existingOrder.id)

        if (
          existingOrder.status === 'pending' &&
          existingOrder.openpay_transaction_id
        ) {
          const chargeRes = await openpayFetch(
            `/charges/${encodeURIComponent(existingOrder.openpay_transaction_id)}`
          )
          const existingCharge = await chargeRes.json()
          const authUrl = existingCharge.payment_method?.url
          if (
            chargeRes.ok &&
            existingCharge.status === 'charge_pending' &&
            authUrl
          ) {
            return NextResponse.json({
              orderId:            existingOrder.id,
              requires3ds:        true,
              authenticationUrl:  authUrl,
              status:             'pending',
              loggedIn:           !!profileId,
            })
          }
        }

        return NextResponse.json({
          orderId:   existingOrder.id,
          openpayId: null,
          status:    existingOrder.status,
          loggedIn:  !!profileId,
        })
      }
    }

    const origin = getPublicSiteOrigin(req)
    const redirectUrl = `${origin}/checkout/3ds-return`
    const localRedirect = isLocalOrigin(redirectUrl)

    if (localRedirect && !serverSandbox) {
      console.error('[checkout] redirect_url localhost en producción:', redirectUrl)
      const devHint =
        process.env.NODE_ENV === 'development'
          ? ' En local activa NEXT_PUBLIC_OPENPAY_SANDBOX=true y OPENPAY_SANDBOX=true en .env.local y reinicia el servidor.'
          : ' En Vercel define NEXT_PUBLIC_SITE_URL con la URL pública del sitio.'
      return NextResponse.json(
        {
          error: `URL de retorno 3D Secure inválida en localhost con OpenPay en producción.${devHint}`,
        },
        { status: 500 }
      )
    }

    const customerWithPhone = validatedCustomer

    const chargeBody = buildOpenPayChargeBody({
      token,
      amount:            parseFloat(total.toFixed(2)),
      deviceSessionId:   deviceSessionId.trim(),
      orderId:           idempotencyKey ?? undefined,
      redirectUrl,
      customer:          customerWithPhone,
    })

    console.log('[checkout] charge redirect_url:', redirectUrl, '| sandbox:', serverSandbox)

    const openpayRes = await openpayFetch('/charges', {
      method: 'POST',
      body:   JSON.stringify(chargeBody),
    })

    const charge = await openpayRes.json()

    console.log(
      '[checkout] OpenPay status:',
      openpayRes.status,
      '| error_code:',
      charge.error_code,
      '| charge_status:',
      charge.status
    )

    if (!openpayRes.ok) {
      console.error(
        '[checkout] OpenPay charge failed — error_code:',
        charge.error_code,
        '| status:',
        charge.status
      )
      return NextResponse.json({ error: getOpenPayError(charge) }, { status: 402 })
    }

    if (charge.status === 'failed') {
      console.error('[checkout] OpenPay charge status failed — error_code:', charge.error_code)
      return NextResponse.json({ error: getOpenPayError(charge) }, { status: 402 })
    }

    const authUrl = charge.payment_method?.url as string | undefined
    if (charge.status === 'charge_pending') {
      if (!authUrl) {
        return NextResponse.json(
          { error: 'No se pudo iniciar la autenticación 3D Secure. Intenta de nuevo.' },
          { status: 402 }
        )
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          profile_id:             profileId,
          status:                 'pending',
          subtotal,
          shipping_cost:          shippingCost,
          discount,
          coupon_code:            validCouponCode,
          total,
          openpay_transaction_id: charge.id,
          shipping_address:       shippingAddress,
          customer_email:         validatedCustomer.email,
          customer_name:          `${validatedCustomer.firstName} ${validatedCustomer.lastName}`.trim(),
          customer_phone:         validatedCustomer.phone,
          idempotency_key:        idempotencyKey ?? null,
        })
        .select()
        .single()

      if (orderError || !order) {
        console.error('[checkout] Error guardando orden 3DS:', orderError)
        return NextResponse.json(
          { error: 'Ocurrió un error al registrar tu orden. Intenta de nuevo.' },
          { status: 500 }
        )
      }

      await supabase.from('order_items').insert(
        validatedItems.map((i) => ({
          order_id:   order.id,
          product_id: i.productId,
          quantity:   i.quantity,
          unit_price: i.price,
        }))
      )

      return NextResponse.json({
        orderId:            order.id,
        openpayId:          charge.id,
        requires3ds:        true,
        authenticationUrl:  authUrl,
        status:             'pending',
        loggedIn:           !!profileId,
      })
    }

    if (charge.status !== 'completed' && charge.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'El pago no fue aprobado. Intenta de nuevo o usa otra tarjeta.' },
        { status: 402 }
      )
    }

    const orderStatus: 'paid' | 'pending' =
      charge.status === 'completed' ? 'paid' : 'pending'

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        profile_id:             profileId,
        status:                 orderStatus,
        subtotal,
        shipping_cost:          shippingCost,
        discount,
        coupon_code:            validCouponCode,
        total,
        openpay_transaction_id: charge.id,
        shipping_address:       shippingAddress,
        customer_email:         validatedCustomer.email,
        customer_name:          `${validatedCustomer.firstName} ${validatedCustomer.lastName}`.trim(),
        customer_phone:         validatedCustomer.phone,
        idempotency_key:        idempotencyKey ?? null,
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('[checkout] Error guardando orden:', orderError)

      try {
        const refundRes = await openpayFetch(`/charges/${charge.id}/refund`, {
          method: 'POST',
          body:   JSON.stringify({ description: 'Reembolso automático por error interno al registrar orden' }),
        })
        if (refundRes.ok) {
          console.log('[checkout] Reembolso automático exitoso para cargo:', charge.id)
        } else {
          const rd = await refundRes.json()
          console.error('[checkout] Fallo en reembolso automático:', rd)
        }
      } catch (refundErr) {
        console.error('[checkout] Excepción en reembolso automático:', refundErr)
      }

      return NextResponse.json(
        { error: 'Ocurrió un error al registrar tu orden. Tu cargo será reembolsado en 3–5 días hábiles. Escríbenos por WhatsApp para seguimiento.' },
        { status: 500 }
      )
    }

    await supabase.from('order_items').insert(
      validatedItems.map((i) => ({
        order_id:   order.id,
        product_id: i.productId,
        quantity:   i.quantity,
        unit_price: i.price,
      }))
    )

    await fulfillPaidOrder(supabase, {
      orderId:         order.id,
      wixOrderNumber:  order.wix_order_number,
      profileId,
      items:           validatedItems,
      customer:        customerWithPhone,
      shippingAddress,
      subtotal,
      shippingCost,
      total,
      validCouponCode,
      productIds,
      sendEmail:       orderStatus === 'paid',
    })

    return NextResponse.json({
      orderId:   order.id,
      openpayId: charge.id,
      status:    orderStatus,
      loggedIn:  !!profileId,
    })
  } catch (err) {
    console.error('[checkout] Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
