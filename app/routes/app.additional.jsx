import { json } from "@remix-run/node";
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
import { Form, useFetcher, useLoaderData } from "@remix-run/react";

// Fetch data from Prisma
export const loader = async ({ request }) => {
  await authenticate.admin(request);

  const enquiries = await prisma.enquiry.findMany({
    orderBy: { createdAt: "desc" },
  });


  // Convert phone (BigInt) to string for each enquiry
  const serializableEnquiries = enquiries.map((enquiry) => ({
    ...enquiry,
    phone: enquiry.phone.toString(),
  }));

  return json({ enquiries: serializableEnquiries });
};

// Handle delete action
export const action = async ({ request }) => {
  await authenticate.admin(request);

  // const formData = await request.formData.name('id');
  // const enquiryId = formData.get("id");

  const formData = await request.formData();
  const id = formData.get('id');
  // console.log('id', id)

  if (!id) return json({ error: "Invalid request" }, { status: 400 });

  try {
    await prisma.enquiry.delete({
      where: { id: Number(id) },
    });
    return json({ success: true });
  } catch (error) {
    return json({ error: "Failed to delete enquiry" }, { status: 500 });
  }
};

export default function Dashboard() {
  const { enquiries } = useLoaderData();
  const fetcher = useFetcher(); // Fetcher to send delete requests


  const [activeModal, setActiveModal] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);

  // Polaris IndexTable selection hook
  const { selectedResources, handleSelectionChange } =
    useIndexResourceState(enquiries);

  // Handle row click
  const handleRowClick = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setActiveModal(true);
  };

  // Close modal
  const closeModal = () => {
    setActiveModal(false);
    setSelectedEnquiry(null);
  };

  // Handle delete
  const handleDelete = (id) => {
    fetcher.submit(
      { id },
      { method: "delete", action: "." } // Use the current route
    );
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
            { title: "Actions" }, // Added Actions column
          ]}
        >
          {enquiries.map((enquiry, index) => (
            <IndexTable.Row
              id={enquiry.id}
              key={enquiry.id}
              selected={selectedResources.includes(enquiry.id)}
              position={index}
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
              <IndexTable.Cell>
                <Form method="post">
                  {/* <input type="hidden" name="id" value={enquiry.id} />
                  <button type="submit">Delete</button> */}
                  <Button
                    destructive
                    onClick={() => handleDelete(enquiry.id)}
                  >
                    Delete
                  </Button>
                </Form>
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
