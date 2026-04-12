import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (stripeInstance) return stripeInstance

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error(
      'STRIPE_SECRET_KEY environment variable is required but not set'
    )
  }

  stripeInstance = new Stripe(secretKey, {
    typescript: true,
  })

  return stripeInstance
}

/** Reset instance (for testing only) */
export function _resetStripeInstance(): void {
  stripeInstance = null
}
