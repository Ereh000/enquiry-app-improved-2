import { useLoaderData, json } from "@remix-run/react";
import {
  Page,
  Card,
  DataTable,
  Text,
  Modal,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { useState } from "react";

// Fetch data from Prisma
export const loader = async ({ request }) => {
  await authenticate.admin(request);

  const enquiries = await prisma.enquiry.findMany({
    orderBy: { createdAt: "desc" },
  });

  return json({ enquiries });
};

export default function Dashboard() {
  const { enquiries } = useLoaderData();

  const [activeModal, setActiveModal] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null); // ✅ FIXED: Initialized with null

  const handleRowClick = (rowIndex) => {
    console.log("Row clicked:", rowIndex); // ✅ DEBUGGING LOG

    setSelectedEnquiry(enquiries[rowIndex]);
    setActiveModal(true);
  };

  const closeModal = () => {
    console.log("Modal closed"); // ✅ DEBUGGING LOG

    setActiveModal(false);
    setSelectedEnquiry(null);
  };

  return (
    <Page
      title="Enquiries Dashboard"
      subtitle="View all customer enquiriesss"
      style={{ maxWidth: "1200px", margin: "0 auto" }}
    >
      <Card sectioned>
        <DataTable
          columnContentTypes={["text", "text", "numeric", "text", "text"]}
          headings={["Name", "Email", "Phone", "Query", "Date"]}
          rows={enquiries.map((enquiry) => [
            enquiry.name,
            enquiry.email,
            enquiry.phone.toString(),
            `${enquiry.query.substring(0, 50)}${enquiry.query.length > 50 ? "..." : ""}`,
            new Date(enquiry.createdAt).toLocaleDateString(),
          ])}
          onRowClick={(rowIndex) => handleRowClick(rowIndex)} // ✅ FIXED
          hoverable
          style={{ cursor: "pointer" }}
        />

        {enquiries.length === 0 && (
          <Text variation="subdued">No enquiries found</Text>
        )}
      </Card>

      {/* Customer Details Modal */}
      <Modal
        open={activeModal}
        onClose={closeModal}
        title="Customer Details"
        primaryAction={{
          content: "Close",
          onAction: closeModal,
        }}
      >
        <Modal.Section>
          {selectedEnquiry ? ( // ✅ FIXED: Ensure modal content is only shown if `selectedEnquiry` is set
            <Card sectioned>
              <Text as="h2" variant="headingMd">
                {selectedEnquiry.name}
              </Text>
              <Text as="p" variant="bodyMd">
                <strong>Email:</strong> {selectedEnquiry.email}
              </Text>
              <Text as="p" variant="bodyMd">
                <strong>Phone:</strong> {selectedEnquiry.phone}
              </Text>
              <Text as="p" variant="bodyMd">
                <strong>Query:</strong> {selectedEnquiry.query}
              </Text>
              <Text as="p" variant="bodyMd">
                <strong>Date:</strong> {new Date(selectedEnquiry.createdAt).toLocaleString()}
              </Text>
            </Card>
          ) : (
            <Text variation="subdued">No details available</Text>
          )}
        </Modal.Section>
      </Modal>
    </Page>
  );
}
