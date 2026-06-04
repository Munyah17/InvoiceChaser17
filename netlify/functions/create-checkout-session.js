const Stripe = require("stripe");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { plan, amount, email, plan_id, user_id, metadata = {} } = JSON.parse(event.body);

    const isSubscription = ["starter", "professional", "business"].includes(plan_id || plan);
    const origin = event.headers.origin || process.env.URL || "https://vocal-paletas-03d14f.netlify.app";

    const lineItem = {
      price_data: {
        currency: "usd",
        product_data: {
          name: plan,
        },
        unit_amount: amount,
      },
      quantity: 1,
    };

    if (isSubscription) {
      lineItem.price_data.recurring = { interval: "month" };
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: isSubscription ? "subscription" : "payment",
      customer_email: email,
      line_items: [lineItem],
      metadata: {
        user_id: user_id || "guest",
        plan_id: plan_id || plan,
        ...metadata,
      },
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&plan=${plan_id || plan}`,
      cancel_url: `${origin}/checkout?plan=${plan_id || plan}`,
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error) {
    console.error("Stripe error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
