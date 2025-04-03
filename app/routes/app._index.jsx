import { json } from "@remix-run/node";
import {
  Page,
  Card,
  IndexTable,
  Text,
  Button,
  Modal,
  useIndexResourceState,
  Pagination,
  TextField,
  Select,
  LegacyCard,
  RadioButton,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server"; // Assuming this path
import prisma from "../db.server"; // Assuming this path
import { useEffect, useState } from "react";
import { Form, useFetcher, useLoaderData } from "@remix-run/react";

import * as XLSX from 'xlsx';

// Loader function to fetch enquiries data from the database
export const loader = async ({ request }) => {
  // Authenticate the admin user to ensure only admins can access this data
  await authenticate.admin(request);

  // Fetch all enquiries from the database, ordered by creation date in descending order.
  // This ensures the newest enquiries are displayed first.
  const enquiries = await prisma.enquiry.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Convert the phone number to a string.  The phone number is stored as a BigInt
  // in the database, which can cause serialization issues when sending it as JSON.
  // Converting it to a string ensures it's compatible with JSON.
  const serializableEnquiries = enquiries.map((enquiry) => ({
    ...enquiry,
    phone: enquiry.phone.toString(),
  }));

  // Return the fetched and serialized enquiries data as a JSON response.  This data
  // will be available to the component via useLoaderData().
  return json({ enquiries: serializableEnquiries });
};

// Action function to handle deleting enquiries
export const action = async ({ request }) => {
  // Authenticate the admin user before allowing any deletions.
  await authenticate.admin(request);

  // Extract the form data from the request.  This is used to get the ID of the
  // enquiry that the user wants to delete.
  const formData = await request.formData();
  const id = formData.get('id');

  // Attempt to delete the enquiry from the database using Prisma.
  try {
    await prisma.enquiry.delete({
      where: { id: Number(id) }, // The ID is passed as a string, so convert to a Number.
    });
    // If the deletion is successful, return a JSON response with a success message.
    return json({ success: true });
  } catch (error) {
    // If there's an error during the deletion process (e.g., the ID doesn't exist),
    // return a JSON response with an error message and a 500 status code.
    return json({ error: "Failed to delete enquiry" }, { status: 500 });
  }
};

// Main Dashboard component to display and manage enquiries
export default function Dashboard() {
  // Retrieve the enquiries data from the loader function.  This data is now
  // available to the component, and will trigger a re-render when it changes.
  const { enquiries } = useLoaderData();

  // Initialize a fetcher for handling form submissions (like deleting enquiries)
  // without a full page reload.  This is a Remix feature.
  const fetcher = useFetcher();

  // State to control the visibility of the modal dialog, used to show enquiry details.
  const [activeModal, setActiveModal] = useState(false);

  // State to store the currently selected enquiry, which will be displayed in the modal.
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);

  // State for managing the current page in the paginated table.
  const [currentPage, setCurrentPage] = useState(1);

  // State for setting the number of items to display per page.  This is a constant.
  const [itemsPerPage] = useState(50);

  // State to track whether the component is mounted on the client-side.  This is
  // important for certain operations (like using browser APIs) that can only
  // be done in the browser.  Initially set to false, and then set to true in a useEffect.
  const [isClient, setIsClient] = useState(false);

  // State for storing the user's search query, used to filter the enquiries.
  const [searchQuery, setSearchQuery] = useState("");

  // State for storing the selected sorting option.  Default is 'latest'.
  const [sortOption, setSortOption] = useState("latest");

  // UseEffect hook to set isClient to true after the component has mounted.
  // This ensures that the code inside the useEffect only runs in the browser.
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Use the useIndexResourceState hook from Polaris to manage selected resources
  // in the IndexTable.  In this case, selection is disabled, but the hook is
  // still useful for managing the selectedItemsCount.
  const { selectedResources, handleSelectionChange } =
    useIndexResourceState(enquiries);

  // Function to handle clicking on a row in the IndexTable.  This function sets
  // the selectedEnquiry and opens the modal.
  const handleRowClick = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setActiveModal(true);
  };

  // Function to close the modal dialog.  This function resets the selectedEnquiry
  // and closes the modal.
  const closeModal = () => {
    setActiveModal(false);
    setSelectedEnquiry(null);
  };

  // Function to handle deleting an enquiry.  This function calls the fetcher to
  // submit a delete request to the server.
  const handleDelete = (id) => {
    fetcher.submit(
      { id }, // The ID of the enquiry to delete.
      { method: "delete", action: "." } // The action is ".", which refers to the current route.
    );
  };

  // Function to handle changes in the search query.  This function updates the
  // searchQuery state and resets the current page to 1.
  const handleSearchChange = (value) => {
    setSearchQuery(value.toLowerCase()); // Convert to lowercase for case-insensitive search.
    setCurrentPage(1); // Reset to the first page when the search query changes.
  };

  // Function to handle changes in the sort option. This function updates the
  // sortOption state and resets the current page to 1.
  const handleSortChange = (value) => {
    setSortOption(value);
    setCurrentPage(1); // Reset to the first page when the sort option changes.
  };

  // Logic for sorting the enquiries based on the selected sort option.
  // This creates a new array with the sorted enquiries, without modifying the
  // original 'enquiries' array.
  const sortedEnquiries = [...enquiries].sort((a, b) => {
    if (sortOption === "latest") return new Date(b.createdAt) - new Date(a.createdAt); // Sort by creation date, newest first.
    if (sortOption === "oldest") return new Date(a.createdAt) - new Date(b.createdAt); // Sort by creation date, oldest first.
    if (sortOption === "name") return a.name.localeCompare(b.name); // Sort by name, alphabetically.
  });

  // Logic for filtering the enquiries based on the search query.
  // This creates a new array with the filtered enquiries, without modifying
  // the 'sortedEnquiries' array.
  const filteredEnquiries = sortedEnquiries.filter(
    (enquiry) =>
      enquiry.name.toLowerCase().includes(searchQuery) || // Case-insensitive search on name.
      enquiry.email.toLowerCase().includes(searchQuery) || // Case-insensitive search on email.
      enquiry.phone.toLowerCase().includes(searchQuery)  //Case-insensitive search on phone
  );

  // Logic for calculating the pagination indices.
  const indexOfLastItem = currentPage * itemsPerPage; // Index of the last item on the current page.
  const indexOfFirstItem = indexOfLastItem - itemsPerPage; // Index of the first item on the current page.

  // Get the enquiries to display on the current page.
  const currentEnquiries = filteredEnquiries.slice(indexOfFirstItem, indexOfLastItem);

  // Function to handle moving to the next page.
  const handleNextPage = () => {
    if (currentPage < Math.ceil(filteredEnquiries.length / itemsPerPage)) {
      // Only move to the next page if there are more pages.
      setCurrentPage(currentPage + 1);
    }
  };

  // Function to handle moving to the previous page.
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      // Only move to the previous page if the current page is not the first page.
      setCurrentPage(currentPage - 1);
    }
  };


  // Function to format the date as dd/mm/yyyy --
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Function to export the enquiries data to an Excel file.

  const [exportModalActive, setExportModalActive] = useState(false);
  const [exportOption, setExportOption] = useState("currentPage");
  const exportToExcel = (option) => {
    let dataToExport;
    if (option === "currentPage") {
      dataToExport = currentEnquiries;
    } else if (option === "allData") {
      dataToExport = enquiries; // Assuming `enquiries` contains all data
    } else {
      const today = new Date();
      if (option === "today") {
        dataToExport = enquiries.filter(enquiry => new Date(enquiry.createdAt).toDateString() === today.toDateString());
      } else if (option === "last7Days") {
        const last7Days = new Date(today);
        last7Days.setDate(today.getDate() - 7);
        dataToExport = enquiries.filter(enquiry => new Date(enquiry.createdAt) >= last7Days);
      } else if (option === "last30Days") {
        const last30Days = new Date(today);
        last30Days.setDate(today.getDate() - 30);
        dataToExport = enquiries.filter(enquiry => new Date(enquiry.createdAt) >= last30Days);
      }
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport.map(enquiry => ({
      Name: enquiry.name,
      Email: enquiry.email,
      Phone: enquiry.phone,
      Query: enquiry.query,
      Date: formatDate(enquiry.createdAt),
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Enquiries');
    XLSX.writeFile(workbook, 'enquiries.xlsx');
  };

  // Render the main dashboard UI.
  return (
    <Page
      primaryAction={{
        content: 'Export',
        onAction: () => setExportModalActive(true),
      }}
      fullWidth title="Enquiries Dashboard" subtitle="View all customer enquiries"
    >

      {/* <Button onClick={() => setExportModalActive(true)}>Export</Button> */}


      <div className="searchShortWrapper" style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '16px',
      }}>
        {/* Search input field for filtering enquiries. */}
        <div className="" style={{ width: '100%' }}>
          <TextField
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by name, email or phone"
            autoComplete="off" // Turn off autocomplete to prevent browser suggestions.
          />
        </div>

        {/* Select dropdown for choosing the sorting option. */}
        <Select
          options={[
            { label: "Latest", value: "latest" },
            { label: "Oldest", value: "oldest" },
            { label: "Name: A-Z", value: "name" },
          ]}
          onChange={handleSortChange}
          value={sortOption}
        />
      </div>

      {/* Card component to contain the enquiries table and pagination. */}
      <Card>
        {/* Render the IndexTable only when the component is mounted on the client.
            This prevents errors that can occur if the component is rendered on the
            server, where browser-specific APIs are not available. */}
        {isClient ? (
          <IndexTable
            resourceName={{ singular: "enquiry", plural: "enquiries" }} // Define resource names for accessibility.
            itemCount={filteredEnquiries.length} // Total number of enquiries.
            selectable={false} // Disable row selection.
            selectedItemsCount={selectedResources.length} // Number of selected items (always 0 here).
            onSelectionChange={handleSelectionChange} // Handler for selection changes (not used here).
            headings={[
              // Define the table headers.
              { title: "Name" },
              { title: "Email" },
              { title: "Phone" },
              { title: "Query" },
              { title: "Date" },
              { title: "Actions" },
            ]}
          >
            {/* Map through the enquiries for the current page and render each row. */}
            {currentEnquiries.map((enquiry, index) => (
              <IndexTable.Row
                id={enquiry.id} // Unique ID for the row.
                key={enquiry.id} // React key for the row.
                selected={selectedResources.includes(enquiry.id)} // Whether the row is selected (always false here).
                position={index} // Position of the row in the table.
                onClick={() => handleRowClick(enquiry)} // Click handler to open the modal.
              >
                {/* Render the data for each cell in the row. */}
                <IndexTable.Cell>{enquiry.name}</IndexTable.Cell>
                <IndexTable.Cell>{enquiry.email}</IndexTable.Cell>
                <IndexTable.Cell>{enquiry.phone.toString()}</IndexTable.Cell>
                <IndexTable.Cell>
                  {enquiry.query.length > 50
                    ? `${enquiry.query.substring(0, 50)}...` // Truncate long queries.
                    : enquiry.query}
                </IndexTable.Cell>
                <IndexTable.Cell>
                  {formatDate(enquiry.createdAt)} {/* Format the date. */}
                </IndexTable.Cell>
                <IndexTable.Cell>
                  {/* Form and button for deleting the enquiry. */}
                  <Form method="post">
                    <Button
                      destructive // Style the button as destructive.
                      onClick={() => handleDelete(enquiry.id)} // Click handler to delete.
                    >
                      Delete
                    </Button>
                  </Form>
                </IndexTable.Cell>
              </IndexTable.Row>
            ))}
          </IndexTable>
        ) : (
          // Show a loading message while the component is being mounted on the client.
          <Text variation="subdued">Loading...</Text>
        )}

        {/* Display a message if no enquiries match the search criteria. */}
        {filteredEnquiries.length === 0 && (
          <Text variation="subdued">No enquiries found</Text>
        )}

        {/* Pagination component to navigate between pages. */}
        <Pagination
          hasPrevious={currentPage > 1} // Disable "Previous" button if on the first page.
          hasNext={currentPage < Math.ceil(filteredEnquiries.length / itemsPerPage)} // Disable "Next" button if on the last page.
          onPrevious={handlePreviousPage} // Handler for the "Previous" button.
          onNext={handleNextPage} // Handler for the "Next" button.
        />
      </Card>
      <br />

      {/* Modal component to display detailed enquiry information. */}
      <Modal
        open={activeModal} // Control the visibility of the modal.
        onClose={closeModal} // Handler to close the modal.
        title="Customer Details" // Title of the modal.
        primaryAction={{
          // Primary action button (Close button).
          content: "Close",
          onAction: closeModal,
        }}
      >
        <Modal.Section>
          {/* Display enquiry details if an enquiry is selected. */}
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
                {formatDate(selectedEnquiry.createdAt)} {/* Format the date and time. */}
              </Text>
            </Card>
          ) : (
            // Display a message if no enquiry is selected.
            <Text variation="subdued">No details available</Text>
          )}
        </Modal.Section>
      </Modal>

      {/* Modal for exporting enquiries data. */}
      <Modal
        open={exportModalActive}
        onClose={() => setExportModalActive(false)}
        title="Export Options"
        primaryAction={{
          content: "Export",
          onAction: () => {
            exportToExcel(exportOption);
            setExportModalActive(false);
          },
        }}
      >
        <Modal.Section>
          <Text>Select export option:</Text>
          <div className="" style={{
            display: 'flex', flexDirection: 'column',
          }}>
            <RadioButton
              label="Current Page"
              checked={exportOption === "currentPage"}
              onChange={() => setExportOption("currentPage")}
            />
            <RadioButton
              label="All Data"
              checked={exportOption === "allData"}
              onChange={() => setExportOption("allData")}
            />
            <RadioButton
              label="Today"
              checked={exportOption === "today"}
              onChange={() => setExportOption("today")}
            />
            <RadioButton
              label="Last 7 Days"
              checked={exportOption === "last7Days"}
              onChange={() => setExportOption("last7Days")}
            />
            <RadioButton
              label="Last 30 Days"
              checked={exportOption === "last30Days"}
              onChange={() => setExportOption("last30Days")}
            />
          </div>
        </Modal.Section>
      </Modal>
    </Page >
  );
}
