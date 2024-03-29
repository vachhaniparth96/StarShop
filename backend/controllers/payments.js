const Order = require("../models/Order");

const Stripe = require("stripe");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = {
	stripeCheckoutSession,
	stripeWebhook,
};

// Create stripe checkout session   
async function stripeCheckoutSession(req, res, next) {
	const body = req?.body;

	const line_items = body?.orderItems?.map((item) => {
		return {
			price_data: {
				currency: "usd",
				product_data: {
					name: item?.name,
					images: [item?.image],
					metadata: { productId: item?.product },
				},
				unit_amount: item?.price * 100,
			},
			//Stripe uses its own formatting to interpret tax rates. This formatting is generated on the dev dashboard on stripe after entering the necessary information
			tax_rates: ["txr_1Oa8JRG90QAMAghrhh7b0F0b"],
			quantity: item?.quantity,
		};
	});
	const shippingInfo = body?.shippingInfo;

	//Just like tax rates, Stripe uses its own formatting to interpret shipping rates.
	const shipping_rate =
		body?.itemsPrice >= 200
			? "shr_1Oa8HFG90QAMAghrSSUd29TF"
			: "shr_1Oa8HpG90QAMAghrmsKpRQCC";

	const session = await stripe.checkout.sessions.create({
		payment_method_types: ["card"],
		success_url: `https://main--starshopcapstone.netlify.app/`,
		cancel_url: `https://main--starshopcapstone.netlify.app/cart`,
		customer_email: req?.user?.email,
		client_reference_id: req?.user?._id?.toString(),
		mode: "payment",
		metadata: { ...shippingInfo, itemsPrice: body?.itemsPrice },
		shipping_options: [
			{
				shipping_rate,
			},
		],
		line_items,
	});

	res.status(200).json({
		url: session.url,
	});
}

//Getting order items to use in the Stripe Webhook
async function getOrderItems(line_items) {
	return new Promise((resolve, reject) => {
		let cartItems = [];

		line_items?.data?.forEach(async (item) => {
			const product = await stripe.products.retrieve(item.price.product);
			const productId = product.metadata.productId;

			cartItems.push({
				product: productId,
				name: product.name,
				price: item.price.unit_amount_decimal / 100,
				quantity: item.quantity,
				image: product.images[0],
			});

			if (cartItems.length === line_items?.data?.length) {
				resolve(cartItems);
			}
		});
	});
}

// Stripe Webhook to handle the payment
async function stripeWebhook(req, res, next) {
	try {
		const signature = req.headers["stripe-signature"];

		const event = stripe.webhooks.constructEvent(
			req.rawBody,
			signature,
			process.env.STRIPE_WEBHOOK_SECRET
		);

		if (event.type === "checkout.session.completed") {
			const session = event.data.object;

			const line_items = await stripe.checkout.sessions.listLineItems(
				session.id
			);

			const orderItems = await getOrderItems(line_items);
			const user = session.client_reference_id;

			const totalAmount = session.amount_total / 100;
			const taxAmount = session.total_details.amount_tax / 100;
			const shippingAmount = session.total_details.amount_shipping / 100;
			const itemsPrice = session.metadata.itemsPrice;

			const shippingInfo = {
				address: session.metadata.address,
				city: session.metadata.city,
				phoneNo: session.metadata.phoneNo,
				zipCode: session.metadata.zipCode,
				country: session.metadata.country,
			};

			const paymentInfo = {
				id: session.payment_intent,
				status: session.payment_status,
			};

			const orderData = {
				shippingInfo,
				orderItems,
				itemsPrice,
				taxAmount,
				shippingAmount,
				totalAmount,
				paymentInfo,
				paymentMethod: "Card",
				user,
			};

			await Order.create(orderData);

			res.status(200).json({ success: true }).end();
		}
	} catch (error) {
		("Error => ", error);
	}
}
