import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendOrderConfirmation } from '@/lib/email/templates'
import { validateCoupon } from '@/lib/coupons'
import { SHIPPING_COST } from '@/lib/constants'

// ─────────────────────────────────────────────────────────────────────────────
// Configuración OpenPay
// ─────────────────────────────────────────────────────────────────────────────
const OPENPAY_API = process.env.NEXT_PUBLIC_OPENPAY_SANDBOX === 'true'
  ? 'https://sandbox-api.openpay.mx/v1'
  : 'https://api.openpay.mx/v1'

const MERCHANT_ID = process.env.NEXT_PUBLIC_OPENPAY_MERCHANT_ID!
const PRIVATE_KEY  = process.env.OPENPAY_PRIVATE_KEY!

function authHeader() {
  return 'Basic ' + Buffer.from(`${PRIVATE_KEY}:`).toString('base64')
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapa de códigos de error OpenPay → mensajes en español
// ─────────────────────────────────────────────────────────────────────────────
const OPENPAY_ERROR_MESSAGES: Record<number, string> = {
  1001: 'Los datos enviados son inválidos. Verifica la información e intenta de nuevo.',
  1002: 'No estás autorizado para realizar esta operación.',
  1003: 'La solicitud contiene parámetros incorrectos.',
  1004: 'El servicio de pagos no está disponible en este momento. Intenta más tarde.',
  2004: 'El número de tarjeta no es válido. Verifica los dígitos.',
  2005: 'La tarjeta ha expirado. Usa una tarjeta vigente.',
  2006: 'El código de seguridad (CVV) no fue proporcionado.',
  2007: 'Esta tarjeta de prueba solo funciona en modo sandbox.',
  2009: 'El código de seguridad (CVV) es incorrecto.',
  2010: 'La autenticación 3D Secure falló. Intenta de nuevo.',
  2011: 'Este tipo de tarjeta no admite pagos en línea.',
  3001: 'La tarjeta fue declinada. Contacta a tu banco o usa otra tarjeta.',
  3002: 'La tarjeta ha expirado. Usa una tarjeta vigente.',
  3003: 'Fondos insuficientes. Verifica el saldo disponible en tu cuenta.',
  3004: 'La tarjeta fue reportada como robada. Contacta a tu banco.',
  3005: 'El pago fue rechazado por el sistema antifraude. Intenta con otra tarjeta.',
  3006: 'Esta operación no está permitida para esta tarjeta.',
  3008: 'Esta tarjeta no admite transacciones en línea. Usa otra tarjeta.',
  3009: 'La tarjeta fue reportada como perdida. Contacta a tu banco.',
  3010: 'Tu banco ha restringido esta tarjeta. Contacta al banco emisor.',
  3011: 'Tu banco solicitó retener la tarjeta. Contacta al banco emisor.',
  3012: 'Tu banco requiere autorización adicional para este pago. Contacta al banco.',
  4001: 'Fondos insuficientes en la cuenta del comercio.',
  4002: 'Existen comisiones vencidas. La operación no puede completarse.',
}

function getOpenPayError(charge: { error_code?: number; description?: string }): string {
  if (charge.error_code && OPENPAY_ERROR_MESSAGES[charge.error_code]) {
    return OPENPAY_ERROR_MESSAGES[charge.error_code]
  }
  return charge.description ?? 'El pago fue rechazado. Intenta con otra tarjeta.'
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/checkout
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      token, deviceSessionId, idempotencyKey,
      amount, items, customer, shippingAddress, couponCode,
    } = body

    if (!token || !amount || !items?.length) {
      return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 })
    }

    // 0. Obtener usuario autenticado si existe
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    const profileId = user?.id ?? null

    const supabase = createAdminClient()

    // ── 0b. Cálculo de montos del lado del servidor (no confiar en el cliente) ──
    const subtotal = items.reduce(
      (acc: number, i: { price: number; quantity: number }) => acc + i.price * i.quantity,
      0
    )

    // Leer costo de envío desde site_settings (fallback a constante si la tabla no existe aún)
    const { data: shippingSetting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'shipping_cost')
      .single()
    const globalShippingCost = shippingSetting ? parseFloat(shippingSetting.value) : SHIPPING_COST

    // Re-validar cupón en el servidor y recalcular descuento/envío
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

    // Calcular envío: máximo entre shipping_cost de cada producto (o global si null)
    const productIds = [...new Set(items.map((i: { productId: string }) => i.productId))]
    const { data: productShipping } = await supabase
      .from('products')
      .select('id, shipping_cost')
      .in('id', productIds)
    const shippingMap = new Map(
      (productShipping ?? []).map((p: { id: string; shipping_cost: number | null }) => [p.id, p.shipping_cost])
    )
    const itemShippingCosts = items.map(
      (i: { productId: string }) => shippingMap.get(i.productId) ?? globalShippingCost
    )
    const shippingCost = freeShipping ? 0 : Math.max(...itemShippingCosts)
    const total = Math.max(0, subtotal - discount + shippingCost)

    // ── 1. Idempotencia: retornar orden existente si ya se procesó ─────────────
    if (idempotencyKey) {
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id, status')
        .eq('idempotency_key', idempotencyKey)
        .single()

      if (existingOrder) {
        console.log('[checkout] Orden duplicada detectada, retornando existente:', existingOrder.id)
        return NextResponse.json({
          orderId:   existingOrder.id,
          openpayId: null,
          status:    existingOrder.status,
        })
      }
    }

    // ── 2. Crear cargo en OpenPay ──────────────────────────────────────────────
    const chargeBody = {
      source_id:         token,
      method:            'card',
      amount:            parseFloat(total.toFixed(2)),
      currency:          'MXN',
      description:       'Compra Empire Nutrition',
      device_session_id: deviceSessionId,
      customer: {
        name:         customer.firstName,
        last_name:    customer.lastName,
        email:        customer.email,
        phone_number: customer.phone,
      },
    }

    const openpayRes = await fetch(`${OPENPAY_API}/${MERCHANT_ID}/charges`, {
      method:  'POST',
      headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
      body:    JSON.stringify(chargeBody),
    })

    const charge = await openpayRes.json()

    // Log completo para diagnóstico (ver en terminal / Vercel logs)
    console.log('[checkout] OpenPay status:', openpayRes.status, '| error_code:', charge.error_code, '| description:', charge.description, '| charge_status:', charge.status)

    // Cargo rechazado
    if (!openpayRes.ok) {
      console.error('[checkout] OpenPay charge failed — full response:', JSON.stringify(charge))
      return NextResponse.json({ error: getOpenPayError(charge) }, { status: 402 })
    }

    // Cargo fallido explícito
    if (charge.status === 'failed') {
      return NextResponse.json({ error: getOpenPayError(charge) }, { status: 402 })
    }

    // Status inesperado (ni completed ni in_progress)
    if (charge.status !== 'completed' && charge.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'El pago no fue aprobado. Intenta de nuevo o usa otra tarjeta.' },
        { status: 402 }
      )
    }

    const orderStatus: 'paid' | 'pending' =
      charge.status === 'completed' ? 'paid' : 'pending'

    // ── 3. Guardar orden en Supabase ───────────────────────────────────────────
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
        customer_email:         customer.email,
        customer_name:          `${customer.firstName} ${customer.lastName}`.trim(),
        idempotency_key:        idempotencyKey ?? null,
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('[checkout] Error guardando orden:', orderError)

      // ── Reembolso automático ──────────────────────────────────────────────
      try {
        const refundRes = await fetch(
          `${OPENPAY_API}/${MERCHANT_ID}/charges/${charge.id}/refund`,
          {
            method:  'POST',
            headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
            body:    JSON.stringify({ description: 'Reembolso automático por error interno al registrar orden' }),
          }
        )
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

    // ── 4. Guardar items de la orden ───────────────────────────────────────────
    const orderItems = items.map(
      (i: { productId: string; quantity: number; price: number }) => ({
        order_id:   order.id,
        product_id: i.productId,
        quantity:   i.quantity,
        unit_price: i.price,
      })
    )
    await supabase.from('order_items').insert(orderItems)

    // ── 4b. Incrementar uso del cupón (atómico vía RPC) ────────────────────────
    if (validCouponCode) {
      await supabase.rpc('increment_coupon_usage', { p_code: validCouponCode })
    }

    // ── 5. Decrementar stock solo de productos con manage_stock = true ──────
    const { data: stockProducts } = await supabase
      .from('products')
      .select('id')
      .in('id', productIds)
      .eq('manage_stock', true)
    const trackedIds = new Set((stockProducts ?? []).map((p: { id: string }) => p.id))
    await Promise.allSettled(
      items
        .filter((i: { productId: string }) => trackedIds.has(i.productId))
        .map((i: { productId: string; quantity: number }) =>
          supabase.rpc('decrement_stock', {
            p_product_id: i.productId,
            p_quantity:   i.quantity,
          })
        )
    )

    // ── 5b. Actualizar perfil si el usuario está logeado ─────────────────────
    if (profileId) {
      const name = `${customer.firstName} ${customer.lastName}`.trim()
      try {
        const profileUpdates: Record<string, string> = {}
        if (name) profileUpdates.full_name = name
        if (customer.phone) profileUpdates.phone = customer.phone
        if (Object.keys(profileUpdates).length > 0) {
          await supabase.from('profiles').update(profileUpdates).eq('id', profileId)
        }
      } catch {
        // silencioso — no bloquear el checkout por un fallo de perfil
      }
    }

    // ── 5c. Guardar dirección en la tabla addresses (si el usuario está logeado) ──
    if (profileId && shippingAddress) {
      try {
        const { data: existingAddr } = await supabase
          .from('addresses')
          .select('id')
          .eq('profile_id', profileId)
          .eq('street',     shippingAddress.street ?? '')
          .eq('zip_code',   shippingAddress.zip ?? '')
          .maybeSingle()

        if (!existingAddr) {
          await supabase.from('addresses').insert({
            profile_id:   profileId,
            street:       shippingAddress.street ?? '',
            num_exterior: shippingAddress.numExterior ?? null,
            num_interior: shippingAddress.numInterior ?? null,
            colonia:      shippingAddress.colonia ?? null,
            municipio:    shippingAddress.municipio ?? null,
            referencias:  shippingAddress.referencias ?? null,
            city:         shippingAddress.city ?? '',
            state:        shippingAddress.state ?? '',
            zip_code:     shippingAddress.zip ?? '',
            country:      shippingAddress.country ?? 'México',
          })
        }
      } catch {
        // silencioso — no bloquear el checkout por un fallo de dirección
      }
    }

    // ── 6. Enviar correo de confirmación (no-op si falta RESEND_API_KEY) ───────
    if (orderStatus === 'paid') {
      try {
        await sendOrderConfirmation({
          to:              customer.email,
          orderId:         order.id,
          items,
          subtotal,
          shipping:        shippingCost,
          total,
          name:            `${customer.firstName} ${customer.lastName}`,
          shippingAddress: {
            street:      shippingAddress.street,
            numExterior: shippingAddress.numExterior,
            numInterior: shippingAddress.numInterior,
            colonia:     shippingAddress.colonia,
            municipio:   shippingAddress.municipio,
            referencias: shippingAddress.referencias,
            city:        shippingAddress.city,
            state:       shippingAddress.state,
            zip:         shippingAddress.zip,
            country:     shippingAddress.country ?? 'México',
          },
        })
      } catch (emailErr) {
        console.warn('[checkout] Email no enviado:', emailErr)
      }
    }

    return NextResponse.json({
      orderId:   order.id,
      openpayId: charge.id,
      status:    orderStatus,
    })
  } catch (err) {
    console.error('[checkout] Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
