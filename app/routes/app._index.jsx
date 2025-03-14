import { useLoaderData, json } from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  Text,
  Button,
  Modal,
  useIndexResourceState,
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
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);

  // Polaris IndexTable selection hook
  const { selectedResources, handleSelectionChange } =
    useIndexResourceState(enquiries);

  // Handle row click
  const handleRowClick = (enquiry) => {
    console.log("Row clicked:", enquiry); // ✅ DEBUGGING
    setSelectedEnquiry(enquiry);
    setActiveModal(true);
  };

  // Close modal
  const closeModal = () => {
    console.log("Modal closed"); // ✅ DEBUGGING
    setActiveModal(false);
    setSelectedEnquiry(null);
  };

  return (
    <Page title="Enquiries Dashboard" subtitle="View all customer enquiries">
      <Card>
        <IndexTable
          resourceName={{ singular: "enquiry", plural: "enquiries" }}
          itemCount={enquiries.length}
          selectable={false}
          selectedItemsCount={selectedResources.length}
          onSelectionChange={handleSelectionChange}
          headings={[
            { title: "Name" },
            { title: "Email" },
            { title: "Phone" },
            { title: "Query" },
            { title: "Date" },
          ]}
        >
          {enquiries.map((enquiry, index) => (
            <IndexTable.Row
              id={enquiry.id}
              key={enquiry.id}
              selected={selectedResources.includes(enquiry.id)}
              position={index}
              onClick={() => handleRowClick(enquiry)} // ✅ Handle click to open modal
            >
              <IndexTable.Cell>{enquiry.name}</IndexTable.Cell>
              <IndexTable.Cell>{enquiry.email}</IndexTable.Cell>
              <IndexTable.Cell>{enquiry.phone.toString()}</IndexTable.Cell>
              <IndexTable.Cell>
                {enquiry.query.length > 50
                  ? `${enquiry.query.substring(0, 50)}...`
                  : enquiry.query}
              </IndexTable.Cell>
              <IndexTable.Cell>
                {new Date(enquiry.createdAt).toLocaleDateString()}
              </IndexTable.Cell>
            </IndexTable.Row>
          ))}
        </IndexTable>

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
          {selectedEnquiry ? (
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
                <strong>Date:</strong>{" "}
                {new Date(selectedEnquiry.createdAt).toLocaleString()}
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
