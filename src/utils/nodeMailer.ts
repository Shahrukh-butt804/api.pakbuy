import nodemailer, { Transporter } from "nodemailer";

// Define transporter with Mailtrap SMTP settings
const transporter: Transporter = nodemailer.createTransport({

  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "wpalerts0@gmail.com",
    pass: "pjarcsnytjlnkdkq",
  },
});

// Define the function with proper TypeScript types
export default async function sendEmail(
  to: string,
  subject: string,
  text: string,
): Promise<boolean> {
  try {
    const mailOptions = {
      from: "Saloon Extension",
      to,
      subject,
      text,
    };

    await transporter.sendMail(mailOptions);
    return true; // Email sent successfully
  } catch (error) {
    console.error("Error sending email:", error);
    return false; // Email sending failed
  }
}


export async function orderConfirmation(
  to: string | any,
  subject: string,
  orderDetails: {
    customerName: string;
    orderId: string;
    // items: { name: string; quantity: number; price: number }[];
    totalAmount: number;
    orderDate: string;
    trackingLink: string;
  }
): Promise<boolean> {
  try {
    const { customerName, orderId,
      // items,
      totalAmount, orderDate, trackingLink } = orderDetails;

    // const itemList = items
    //   .map(
    //     (item) =>
    //       `- ${item.name} (x${item.quantity}) - Rs. ${item.price * item.quantity}`
    //   )
    //   .join('\n');

    const text = `
Hi ${customerName},

Thank you for your order!

🧾 Order ID: ${orderId}
📅 Order Date: ${orderDate}



💰 Total Amount: Rs. ${totalAmount}

We’re processing your order and will notify you once it’s ready.

📦 Tracking Link: ${trackingLink}

Thank you for choosing Saloon Extension!

Best regards,  
Saloon Extension Team
    `;

    const mailOptions = {
      from: "Saloon Extension",
      to,
      subject,
      text,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}
