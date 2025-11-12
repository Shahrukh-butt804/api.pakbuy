import nodemailer, { Transporter } from "nodemailer";
import dotenv from "dotenv";


const env = process.env.NODE_ENV || "development";
dotenv.config({ path: `.env.${env}` });

const adminMail = ["ronsmithdocs@gmail.com", "sc@choose-well.today"];


// Define transporter with Mailtrap SMTP settings
const transporter: Transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "wpalerts0@gmail.com",
    pass: "qwazerfwinhzzjpy",
  },
});

// Define the function with proper TypeScript types
export default async function sendEmail(
  to: string | any,
  subject: string,
  text: string,
): Promise<boolean> {
  try {
    const mailOptions = {
      from: "choose well",
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
  body: string,
  orderDetails: {
    customerName: string;
    orderId: string;
    totalAmount: number;
    orderDate: string;
    trackingLink: string;
    packageData: any
  }
): Promise<boolean> {
  try {
    const { customerName, orderId, totalAmount, orderDate, trackingLink, packageData } = orderDetails;


    const text = `
Hi ${customerName},

Thank you for your order!

🧾 Order ID: ${orderId}
📅 Order Date: ${orderDate}
💰 Total Amount: $ ${totalAmount}


${body}


📦 Tracking Link: ${process.env.BASE_URL + trackingLink}

   ${packageData?.map((item: any) => ` Codes - ${item.name} = ${item.codes.join(", ")}`).join("\n")}

Thank you for choosing choose well!

Best regards,  
choose well Team
    `;

    const mailOptions = {
      from: "choose well",
      to: [...adminMail, to],
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

export async function newsletterRegistration(
  to: string,
  subject: string,
): Promise<boolean> {
  try {

    const text = `

Welcome to the Choose Well community! 🎉

You’ve successfully subscribed to our newsletter.  
We’ll keep you updated with our latest products, offers, and news.

Thanks for joining us!  
Best regards,  
Choose Well Team
    `;

    const mailOptions = {
      from: "choose well",
      to: [...adminMail, to],
      subject,
      text,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending newsletter registration email:", error);
    return false;
  }
}

export async function sendContactUsEmail({
  name,
  email,
  subject,
  message,
}: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const emailSubject = `Contact Us Message: ${subject}`;

  const text = `
You have received a new message from Choose Well contact form.

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

--------------------------------------
This message was sent from the Contact Us form on your website.
  `;

  return await sendEmail(adminMail, emailSubject, text);
}
