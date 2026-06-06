"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cart";
import { LEGAL, LEGAL_LINKS } from "@/lib/site-legal";
import { getOpenPayTokenError } from "@/lib/openpay-errors";
import CheckoutFailedSummary, {
  type FailedCheckoutSnapshot,
} from "@/components/checkout/CheckoutFailedSummary";
import { saveLastOrder } from "@/lib/checkout-session";
import CouponField from "@/components/cart/CouponField";
import MexicoAddressFields from "@/components/checkout/MexicoAddressFields";

declare global {
  interface Window {
    OpenPay: {
      setId: (id: string) => void;
      setApiKey: (key: string) => void;
      setSandboxMode: (sandbox: boolean) => void;
      token: {
        create: (
          data: Record<string, string>,
          onSuccess: (r: { data: { id: string } }) => void,
          onError: (e: { message: string }) => void,
        ) => void;
      };
      deviceData: { setup: (formId?: string, fieldName?: string) => string };
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades de validación y formato de tarjeta
// ─────────────────────────────────────────────────────────────────────────────

/** Algoritmo de Luhn — verifica que el número de tarjeta es válido */
function luhnCheck(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\s/g, "");
  if (!/^\d+$/.test(digits) || digits.length < 13) return false;
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

/** Detecta el tipo de tarjeta por los primeros dígitos */
function getCardType(number: string): "visa" | "mastercard" | "amex" | null {
  const n = number.replace(/\s/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^5[1-5]/.test(n) || /^2[2-7]\d{2}/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  return null;
}

/** Formatea el número con espacios cada 4 dígitos (Amex: 4-6-5) */
function formatCardNumber(
  value: string,
  type: "visa" | "mastercard" | "amex" | null,
): string {
  const digits = value.replace(/\D/g, "");
  if (type === "amex") {
    const p1 = digits.slice(0, 4);
    const p2 = digits.slice(4, 10);
    const p3 = digits.slice(10, 15);
    return [p1, p2, p3].filter(Boolean).join(" ");
  }
  const groups = digits.match(/.{1,4}/g) ?? [];
  return groups.join(" ").slice(0, 19);
}

/** Valida la fecha de expiración — retorna mensaje de error o null */
function validateExpiry(month: string, year: string): string | null {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (isNaN(m) || m < 1 || m > 12)
    return "El mes de expiración debe estar entre 01 y 12.";
  if (isNaN(y) || year.length < 2) return "El año de expiración es inválido.";
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  if (y < currentYear || (y === currentYear && m < currentMonth)) {
    return "La tarjeta ha expirado. Usa una tarjeta vigente.";
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Iconos SVG de marcas de tarjeta
// ─────────────────────────────────────────────────────────────────────────────
function VisaIcon() {
  return (
    <svg className="h-6 w-auto" viewBox="0 0 48 16" fill="none">
      <text
        x="0"
        y="13"
        fontFamily="Arial"
        fontWeight="bold"
        fontSize="14"
        fill="#1A1F71"
      >
        VISA
      </text>
    </svg>
  );
}
function MastercardIcon() {
  return (
    <svg className="h-6 w-auto" viewBox="0 0 38 24">
      <circle cx="15" cy="12" r="10" fill="#EB001B" />
      <circle cx="23" cy="12" r="10" fill="#F79E1B" fillOpacity="0.85" />
    </svg>
  );
}
function AmexIcon() {
  return (
    <svg className="h-6 w-auto" viewBox="0 0 48 16" fill="none">
      <text
        x="0"
        y="13"
        fontFamily="Arial"
        fontWeight="bold"
        fontSize="11"
        fill="#2E77BC"
      >
        AMEX
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const router = useRouter();
  const {
    items,
    subtotal,
    total,
    clearCart,
    coupon,
    discount,
    shipping,
    setShippingCost,
  } = useCartStore();
  const sub = subtotal();
  const tot = total();
  const desc = discount();
  const ship = shipping();

  // Cargar costo de envío desde la BD para que el display siempre sea correcto
  useEffect(() => {
    fetch("/api/shipping-cost")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.cost != null) setShippingCost(d.cost);
      })
      .catch(() => {
        /* usa el valor por defecto del store */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [openpayReady, setOpenpayReady] = useState(false);
  const [deviceSessionId, setDeviceSessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [paymentFailed, setPaymentFailed] =
    useState<FailedCheckoutSnapshot | null>(null);
  const [cardType, setCardType] = useState<
    "visa" | "mastercard" | "amex" | null
  >(null);
  // Clave de idempotencia: se genera una sola vez al cargar la página.
  // Si el usuario intenta pagar dos veces con el mismo intento, el backend
  // detecta la clave duplicada y retorna la orden existente sin volver a cobrar.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  /** Evita redirigir a /carrito cuando vaciamos el carrito tras pago exitoso */
  const completingCheckout = useRef(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    street: "",
    numExterior: "",
    numInterior: "",
    referencias: "",
    colonia: "",
    municipio: "",
    state: "",
    zip: "",
    cardNumber: "",
    cardExpMonth: "",
    cardExpYear: "",
    cardCvv: "",
    cardName: "",
  });

  // Redirigir si el carrito está vacío (no durante confirmación ni pantalla de fallo)
  useEffect(() => {
    if (items.length === 0 && !paymentFailed && !completingCheckout.current) {
      router.replace("/carrito");
    }
  }, [items.length, paymentFailed, router]);

  // Cargar OpenPay.js + openpay-data.js (antifraude)
  useEffect(() => {
    const initOpenPay = () => {
      window.OpenPay.setId(process.env.NEXT_PUBLIC_OPENPAY_MERCHANT_ID!);
      window.OpenPay.setApiKey(process.env.NEXT_PUBLIC_OPENPAY_PUBLIC_KEY!);
      window.OpenPay.setSandboxMode(
        process.env.NEXT_PUBLIC_OPENPAY_SANDBOX === "true",
      );

      // deviceData puede tardar un momento en registrarse tras cargar el segundo script
      const trySetup = (attempts = 0) => {
        if (
          window.OpenPay.deviceData &&
          typeof window.OpenPay.deviceData.setup === "function"
        ) {
          try {
            const dsid = window.OpenPay.deviceData.setup(
              "checkout-payment-form",
              "openpay_device_session_id",
            );
            console.log(
              "[OpenPay] deviceData.setup() OK — dsid length:",
              dsid?.length,
              "| starts with:",
              dsid?.slice(0, 8),
            );
            setDeviceSessionId(dsid);
          } catch (e) {
            console.warn("[OpenPay] deviceData.setup() falló:", e);
            setDeviceSessionId(crypto.randomUUID()); // fallback
          }
          setOpenpayReady(true);
        } else if (attempts < 20) {
          setTimeout(() => trySetup(attempts + 1), 200);
        } else {
          // Fallback: sin deviceData aún funciona en sandbox
          console.warn(
            "[OpenPay] deviceData no disponible, usando fallback UUID",
          );
          setDeviceSessionId(crypto.randomUUID());
          setOpenpayReady(true);
        }
      };

      trySetup();
    };

    // Si ya están cargados ambos scripts, solo inicializar
    if (
      document.getElementById("openpay-js") &&
      document.getElementById("openpay-data-js")
    ) {
      if (window.OpenPay) initOpenPay();
      return;
    }

    // Cargar primer script: openpay.v1.min.js
    const script1 = document.createElement("script");
    script1.id = "openpay-js";
    script1.src = "https://js.openpay.mx/openpay.v1.min.js";
    script1.onload = () => {
      // Cargar segundo script: openpay-data.v1.min.js (sistema antifraude)
      const script2 = document.createElement("script");
      script2.id = "openpay-data-js";
      script2.src = "https://js.openpay.mx/openpay-data.v1.min.js";
      script2.onload = initOpenPay;
      script2.onerror = () => {
        // Si el script de datos falla, igual inicializamos con fallback
        console.warn(
          "[OpenPay] No se pudo cargar openpay-data.js, usando UUID fallback",
        );
        window.OpenPay.setId(process.env.NEXT_PUBLIC_OPENPAY_MERCHANT_ID!);
        window.OpenPay.setApiKey(process.env.NEXT_PUBLIC_OPENPAY_PUBLIC_KEY!);
        window.OpenPay.setSandboxMode(
          process.env.NEXT_PUBLIC_OPENPAY_SANDBOX === "true",
        );
        setDeviceSessionId(crypto.randomUUID());
        setOpenpayReady(true);
      };
      document.head.appendChild(script2);
    };
    document.head.appendChild(script1);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /** Solo dígitos para mes, año y CVV */
  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const digits = value.replace(/\D/g, "");
    const maxLen =
      name === "cardExpMonth"
        ? 2
        : name === "cardExpYear"
          ? 2
          : cardType === "amex"
            ? 4
            : 3;
    setForm({ ...form, [name]: digits.slice(0, maxLen) });
  };

  /** Manejo especial del número de tarjeta: formato + detección de tipo */
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const type = getCardType(e.target.value);
    setCardType(type);
    setForm({ ...form, cardNumber: formatCardNumber(e.target.value, type) });
  };

  // ── Validación client-side ─────────────────────────────────────────────────
  function validateForm(): string | null {
    const cleanCard = form.cardNumber.replace(/\s/g, "");
    if (cleanCard.length < 13) return "Número de tarjeta incompleto.";
    if (!luhnCheck(cleanCard))
      return "El número de tarjeta no es válido. Verifica los dígitos.";

    const expiryError = validateExpiry(form.cardExpMonth, form.cardExpYear);
    if (expiryError) return expiryError;

    if (form.cardCvv.length < 3 || !/^\d+$/.test(form.cardCvv)) {
      return "El CVV debe ser de 3 o 4 dígitos numéricos.";
    }
    if (!form.cardName.trim())
      return "Ingresa el nombre como aparece en la tarjeta.";

    // Si no hay número exterior, las referencias son obligatorias
    if (!form.numExterior.trim() && !form.referencias.trim()) {
      return "Ingresa el número exterior o referencias precisas para localizar el domicilio.";
    }

    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPaymentFailed(null);
    setLoading(true);

    if (!acceptedTerms) {
      setError("Debes aceptar los términos y condiciones para continuar.");
      setLoading(false);
      return;
    }

    if (!openpayReady) {
      setError("Openpay no está listo. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    if (!deviceSessionId) {
      setError(
        "Error de inicialización del sistema antifraude. Recarga la página e intenta de nuevo.",
      );
      setLoading(false);
      return;
    }

    // Validación antes de llamar a OpenPay
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    const hiddenDs = document.getElementById(
      "openpay_device_session_id",
    ) as HTMLInputElement | null;
    const sessionId = hiddenDs?.value?.trim() || deviceSessionId;

    // 1. Tokenizar la tarjeta con OpenPay.js
    window.OpenPay.token.create(
      {
        card_number: form.cardNumber.replace(/\s/g, ""),
        holder_name: form.cardName,
        expiration_year: form.cardExpYear,
        expiration_month: form.cardExpMonth,
        cvv2: form.cardCvv,
      },
      async (response) => {
        const token = response.data.id;
        // Usar el Device Session ID real generado al cargar OpenPay.js

        // 2. Enviar al backend
        try {
          const res = await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token,
              deviceSessionId: sessionId,
              openpaySandbox:
                process.env.NEXT_PUBLIC_OPENPAY_SANDBOX === "true",
              idempotencyKey,
              amount: tot,
              couponCode: coupon?.code ?? null,
              items: items.map((i) => ({
                productId: i.product.id,
                name: i.product.name,
                quantity: i.quantity,
                price: i.product.price,
              })),
              customer: {
                firstName: form.firstName,
                lastName: form.lastName,
                email: form.email,
                phone: form.phone,
              },
              shippingAddress: {
                street: form.street,
                numExterior: form.numExterior,
                numInterior: form.numInterior,
                referencias: form.referencias,
                colonia: form.colonia,
                municipio: form.municipio,
                state: form.state,
                zip: form.zip,
                country: "México",
              },
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            const errMsg = data.error ?? "Error al procesar el pago.";
            if (res.status === 402) {
              setPaymentFailed({
                error: errMsg,
                subtotal: sub,
                shipping: ship,
                discount: desc,
                total: tot,
                items: items.map((i) => ({
                  name: i.product.name,
                  quantity: i.quantity,
                  lineTotal: i.product.price * i.quantity,
                })),
              });
            } else {
              setError(errMsg);
            }
            setLoading(false);
            return;
          }

          if (!data.orderId) {
            setError(
              "No se recibió el número de orden. Contacta soporte con tu comprobante.",
            );
            setLoading(false);
            return;
          }

          if (data.requires3ds && data.authenticationUrl) {
            saveLastOrder(data.orderId, form.email);
            window.location.href = data.authenticationUrl;
            return;
          }

          completingCheckout.current = true;
          saveLastOrder(data.orderId, form.email);

          const params = new URLSearchParams({ confirmed: "1" });
          if (data.status === "pending") params.set("status", "pending");

          clearCart();
          router.replace(`/orden/${data.orderId}?${params.toString()}`);
        } catch {
          setError(
            "Error de conexión. Verifica tu internet e intenta de nuevo.",
          );
          setLoading(false);
        }
      },
      (err) => {
        setError(getOpenPayTokenError(err.message));
        setLoading(false);
      },
    );
  };

  const isSandbox = process.env.NEXT_PUBLIC_OPENPAY_SANDBOX === "true";

  if (paymentFailed) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-white font-black text-3xl mb-2">
          Finalizar compra
        </h1>
        <p className="text-zinc-500 text-sm mb-8">
          {LEGAL.tradeName} · {LEGAL.legalName}
        </p>
        <CheckoutFailedSummary
          snapshot={paymentFailed}
          onRetry={() => setPaymentFailed(null)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-white font-black text-3xl mb-2">Finalizar compra</h1>
      <p className="text-zinc-500 text-sm mb-8">
        {LEGAL.tradeName} · {LEGAL.legalName}
      </p>

      <form
        id="checkout-payment-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        <input
          type="hidden"
          name="openpay_device_session_id"
          id="openpay_device_session_id"
          readOnly
          value=""
        />
        {/* ── Formulario ─────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Datos personales */}
          <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <h2 className="text-white font-semibold text-lg mb-4">
              Datos de contacto
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  name: "firstName",
                  label: "Nombre",
                  type: "text",
                  required: true,
                },
                {
                  name: "lastName",
                  label: "Apellido",
                  type: "text",
                  required: true,
                },
                {
                  name: "email",
                  label: "Correo electrónico",
                  type: "email",
                  required: true,
                },
                {
                  name: "phone",
                  label: "Teléfono",
                  type: "tel",
                  required: true,
                },
              ].map((f) => (
                <div key={f.name}>
                  <label className="block text-zinc-400 text-sm mb-1">
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    name={f.name}
                    value={form[f.name as keyof typeof form]}
                    onChange={handleChange}
                    required={f.required}
                    className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 border border-zinc-700
                      focus:outline-none focus:border-zinc-500 text-sm"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Dirección de envío */}
          <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <h2 className="text-white font-semibold text-lg mb-1">
              Dirección de envío
            </h2>
            <p className="text-zinc-500 text-xs mb-4">
              Ingresa tu código postal y elige la colonia del menú — municipio y estado se llenan solos.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Calle — ancho completo */}
              <div className="sm:col-span-2">
                <label className="block text-zinc-400 text-sm mb-1">
                  Calle
                </label>
                <input
                  type="text"
                  name="street"
                  value={form.street}
                  onChange={handleChange}
                  required
                  placeholder="Ej. Av. Insurgentes Sur"
                  className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 border border-zinc-700 focus:outline-none focus:border-zinc-500 text-sm"
                />
              </div>

              {/* Número exterior */}
              <div>
                <label className="block text-zinc-400 text-sm mb-1">
                  Número exterior
                </label>
                <input
                  type="text"
                  name="numExterior"
                  value={form.numExterior}
                  onChange={handleChange}
                  placeholder="Ej. 123"
                  className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 border border-zinc-700 focus:outline-none focus:border-zinc-500 text-sm"
                />
              </div>

              {/* Número interior */}
              <div>
                <label className="block text-zinc-400 text-sm mb-1">
                  Número interior{" "}
                  <span className="text-zinc-600">(opcional)</span>
                </label>
                <input
                  type="text"
                  name="numInterior"
                  value={form.numInterior}
                  onChange={handleChange}
                  placeholder="Ej. Depto 4B"
                  className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 border border-zinc-700 focus:outline-none focus:border-zinc-500 text-sm"
                />
              </div>

              <MexicoAddressFields
                value={{
                  zip: form.zip,
                  colonia: form.colonia,
                  municipio: form.municipio,
                  state: form.state,
                }}
                onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
              />

              {/* Referencias — ancho completo, requerido si no hay núm. exterior */}
              <div className="sm:col-span-2">
                <label className="block text-zinc-400 text-sm mb-1">
                  Referencias
                  {!form.numExterior.trim() ? (
                    <span className="text-red-400 ml-1 text-xs">
                      (requerido al no indicar número exterior)
                    </span>
                  ) : (
                    <span className="text-zinc-600 ml-1 text-xs">
                      (opcional)
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  name="referencias"
                  value={form.referencias}
                  onChange={handleChange}
                  placeholder="Ej. Entre Calle Río y Av. Parque, casa azul con reja negra"
                  className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 border border-zinc-700 focus:outline-none focus:border-zinc-500 text-sm"
                />
              </div>
            </div>
          </section>

          {/* Datos de tarjeta */}
          <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-white font-semibold text-lg mb-1">
                  Datos de tarjeta
                </h2>
                <p className="text-zinc-500 text-xs">
                  Tu información de tarjeta nunca se almacena en nuestros
                  servidores.
                </p>
              </div>
              <Image
                src="/envios/openpay.png"
                alt="Openpay — pagos seguros"
                width={140}
                height={40}
                className="h-10 w-auto object-contain"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-5 pb-4 border-b border-zinc-800">
              <span className="text-zinc-500 text-xs">Aceptamos:</span>
              <VisaIcon />
              <MastercardIcon />
              <AmexIcon />
              <span className="text-zinc-600 text-xs">
                Visa, Mastercard y American Express
              </span>
            </div>

            {/* Tarjetas de prueba — solo en sandbox */}
            {isSandbox && (
              <div className="mb-5 bg-zinc-800 border border-zinc-600 rounded-lg p-4 text-xs space-y-3">
                <p className="text-accent font-semibold uppercase tracking-wide">
                  Modo sandbox — tarjetas de prueba (Openpay)
                </p>
                <p className="text-zinc-500">
                  Fecha: cualquier mes/año{" "}
                  <strong className="text-zinc-400">futuro</strong> · CVV: 3
                  dígitos (Visa/MC) o 4 (Amex) · Nombre: cualquiera
                </p>
                <div>
                  <p className="text-zinc-400 font-medium mb-2">
                    Cargos exitosos (probadas en este comercio)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-zinc-400">
                    <div>
                      <span className="text-zinc-500">Visa</span>
                      <br />
                      <span className="text-white font-mono">
                        4111 1111 1111 1111
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">
                        Mastercard · Santander
                      </span>
                      <br />
                      <span className="text-white font-mono">
                        5555 5555 5555 4444
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">
                        Mastercard (alternativa)
                      </span>
                      <br />
                      <span className="text-white font-mono">
                        5500 0000 0000 0004
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">American Express</span>
                      <br />
                      <span className="text-white font-mono">
                        3456 780000 00007
                      </span>
                    </div>
                  </div>
                  <p className="text-zinc-600 text-[11px] mt-2">
                    Si una tarjeta falla en tokenización, prueba otra de esta
                    lista.
                  </p>
                </div>
                <div>
                  <p className="text-zinc-400 font-medium mb-2">
                    Errores simulados (mensaje genérico al cliente)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-zinc-400">
                    <div>
                      <span className="text-zinc-500">Rechazada · 3001</span>
                      <br />
                      <span className="text-white font-mono">
                        4222 2222 2222 2220
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Expirada · 3002</span>
                      <br />
                      <span className="text-white font-mono">
                        4000 0000 0000 0069
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Sin fondos · 3003</span>
                      <br />
                      <span className="text-white font-mono">
                        4444 4444 4444 4448
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Robada · 3004</span>
                      <br />
                      <span className="text-white font-mono">
                        4000 0000 0000 0119
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Antifraude · 3005</span>
                      <br />
                      <span className="text-white font-mono">
                        4000 0000 0000 0044
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-zinc-600 text-[11px] pt-1 border-t border-zinc-700">
                  Referencia:{" "}
                  <a
                    href="https://documents.openpay.mx/docs/testing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    documents.openpay.mx/docs/testing
                  </a>
                </p>
              </div>
            )}

            <div className="space-y-4">
              {/* Número de tarjeta con detección de tipo */}
              <div>
                <label className="block text-zinc-400 text-sm mb-1">
                  Número de tarjeta
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="cardNumber"
                    value={form.cardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="1234 5678 9012 3456"
                    maxLength={cardType === "amex" ? 17 : 19}
                    required
                    inputMode="numeric"
                    className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 pr-14 border border-zinc-700
                      focus:outline-none focus:border-zinc-500 text-sm font-mono tracking-widest"
                  />
                  {/* Icono de marca */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {cardType === "visa" && <VisaIcon />}
                    {cardType === "mastercard" && <MastercardIcon />}
                    {cardType === "amex" && <AmexIcon />}
                  </div>
                </div>
              </div>

              {/* Nombre en la tarjeta */}
              <div>
                <label className="block text-zinc-400 text-sm mb-1">
                  Nombre en la tarjeta
                </label>
                <input
                  type="text"
                  name="cardName"
                  value={form.cardName}
                  onChange={handleChange}
                  placeholder="Como aparece en la tarjeta"
                  required
                  autoComplete="cc-name"
                  className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 border border-zinc-700
                    focus:outline-none focus:border-zinc-500 text-sm"
                />
              </div>

              {/* Expiración + CVV */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-400 text-sm mb-1">
                    Mes
                  </label>
                  <input
                    type="text"
                    name="cardExpMonth"
                    value={form.cardExpMonth}
                    onChange={handleNumericChange}
                    placeholder="MM"
                    maxLength={2}
                    required
                    inputMode="numeric"
                    className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 border border-zinc-700
                      focus:outline-none focus:border-zinc-500 text-sm text-center"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-sm mb-1">
                    Año
                  </label>
                  <input
                    type="text"
                    name="cardExpYear"
                    value={form.cardExpYear}
                    onChange={handleNumericChange}
                    placeholder="AA"
                    maxLength={2}
                    required
                    inputMode="numeric"
                    className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 border border-zinc-700
                      focus:outline-none focus:border-zinc-500 text-sm text-center"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-sm mb-1">
                    CVV{cardType === "amex" ? " (4 dígitos)" : ""}
                  </label>
                  <input
                    type="password"
                    name="cardCvv"
                    value={form.cardCvv}
                    onChange={handleNumericChange}
                    placeholder="•••"
                    maxLength={cardType === "amex" ? 4 : 3}
                    required
                    inputMode="numeric"
                    className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2.5 border border-zinc-700
                      focus:outline-none focus:border-zinc-500 text-sm text-center"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="bg-red-950 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3 flex gap-2">
              <svg
                className="w-4 h-4 mt-0.5 shrink-0 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <path
                  strokeLinecap="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ── Resumen del pedido ──────────────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 sticky top-20">
            <h2 className="text-white font-semibold text-lg mb-4">Tu pedido</h2>
            <div className="space-y-2 mb-4">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex justify-between text-sm"
                >
                  <span className="text-zinc-400 truncate max-w-[160px]">
                    {item.product.name} × {item.quantity}
                  </span>
                  <span className="text-zinc-300">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-800 pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span>${sub.toFixed(2)}</span>
              </div>
              {coupon && desc > 0 && (
                <div className="flex justify-between text-green-400">
                  <span className="flex items-center gap-1.5">
                    Descuento
                    <span className="font-mono text-xs bg-green-500/15 px-1.5 py-0.5 rounded">
                      {coupon.code}
                    </span>
                  </span>
                  <span>−${desc.toFixed(2)}</span>
                </div>
              )}
              {coupon?.freeShipping && desc === 0 && (
                <div className="flex justify-between text-green-400 text-xs">
                  <span className="font-mono bg-green-500/15 px-1.5 py-0.5 rounded">
                    {coupon.code}
                  </span>
                  <span>Envío gratis</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-400">
                <span>
                  Envío{" "}
                  <Link
                    href={LEGAL_LINKS.envios}
                    className="text-accent hover:underline text-xs"
                  >
                    (ver política)
                  </Link>
                </span>
                {coupon?.freeShipping ? (
                  <span className="text-green-400">Gratis</span>
                ) : (
                  <span>${ship.toFixed(2)}</span>
                )}
              </div>
              <div className="flex justify-between text-white font-bold text-base pt-2 border-t border-zinc-800">
                <span>Total</span>
                <span>${tot.toFixed(2)} MXN</span>
              </div>
            </div>

            <CouponField className="mt-5 pt-5 border-t border-zinc-800" />

            <label className="mt-5 flex items-start gap-2 text-xs text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 rounded border-zinc-600"
              />
              <span>
                Acepto los{" "}
                <Link
                  href={LEGAL_LINKS.terminos}
                  className="text-accent hover:underline"
                >
                  Términos y condiciones
                </Link>
                , la{" "}
                <Link
                  href={LEGAL_LINKS.privacidad}
                  className="text-accent hover:underline"
                >
                  Política de privacidad
                </Link>{" "}
                y las políticas de{" "}
                <Link
                  href={LEGAL_LINKS.envios}
                  className="text-accent hover:underline"
                >
                  envío
                </Link>{" "}
                y{" "}
                <Link
                  href={LEGAL_LINKS.garantia}
                  className="text-accent hover:underline"
                >
                  devoluciones
                </Link>
                .
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !openpayReady || !acceptedTerms}
              className="mt-4 w-full bg-white text-black font-bold py-4 rounded-xl text-base
                hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Procesando...
                </>
              ) : (
                `Pagar $${tot.toFixed(2)} MXN`
              )}
            </button>

            <p className="text-zinc-600 text-xs text-center mt-3 leading-relaxed">
              Pago procesado de forma segura por{" "}
              <strong className="text-zinc-500">Openpay</strong>, operado por
              BBVA. Si tu banco lo requiere, serás redirigido a la autenticación{" "}
              <strong className="text-zinc-500">3D Secure</strong> antes de
              confirmar el cargo.
            </p>
            <div className="flex justify-center mt-2">
              <Image
                src="/envios/openpay.png"
                alt="Openpay"
                width={100}
                height={28}
                className="h-7 w-auto opacity-80 object-contain"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
