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

      // Basic validation
      if (!name || !email || !query) {
        return json(
          { success: false, message: "All fields are required" },
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
        message: "Review submitted successfully!",
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
