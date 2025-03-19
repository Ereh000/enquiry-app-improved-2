// routes/app.proxy.js
// import { Page } from "@shopify/polaris";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";

export const action = async ({ request }) => {
  //   console.log("Proxy endpoint hit");

  const { session } = await authenticate.public.appProxy(request);

  if (session) {
    console.log("response success");
    // return json({ data: "response success Post" });

    try {
      // Parse JSON body only once
      const formData = await request.json();

      // Extract data from request
      const { name, email, phone, query } = formData;

      console.log("Received data:", { name, email, phone, query });

      if (!name) {
        // errors.name = "Name is required.";
        return json(
          { success: false, message: "Name is required." },
          { status: 400 },
        );
      } else if (!/^[A-Za-z\s]+$/.test(name)) {
        return json(
          { success: false, message: "Name can only contain letters and spaces." },
          { status: 400 },
        );
      }

      if (!email) {
        return json(
          { success: false, message: "Email is required." },
          { status: 400 },
        );
      } else if (!/\S+@\S+\.\S+/.test(email)) {
        return json(
          { success: false, message: "Invalid email format." },
          { status: 400 },
        );
      }

      if (!phone) {
        return json(
          { success: false, message: "Phone number is required." },
          { status: 400 },
        );
      } else if (!/^\d{10}$/.test(phone)) {
        return json(
          { success: false, message: "Invalid phone number format. Must be 10 digits." },
          { status: 400 },
        );
      }

      // Basic validation
      if (!query) {
        return json(
          { success: false, message: "Query is required" },
          { status: 400 },  
        );
      }

      //   Save to the database using Prisma
      const newEnquiry = await prisma.enquiry.create({
        data: {
          name: name,
          email: email,
          phone: parseInt(phone), // Convert rating to integer
          query: query,
        },
      });

      console.log("Enquiry saved:", newEnquiry);

      return json({
        success: true,
        message: "Form submitted successfully!",
        // review: newReview,  
      });
    } catch (error) {
      console.error("Error saving review:", error);
      return json(
        { success: false, message: "Database error" },
        { status: 500 },
      );
    }
  }
  return null;
};
