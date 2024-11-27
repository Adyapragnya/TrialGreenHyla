import React, { useState, useEffect, useContext } from "react";
import PropTypes from 'prop-types';
import axios from "axios";
import {CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Icon, Modal, Box, Typography } from "@mui/material";
import Select from "react-select";
import ArgonBox from "components/ArgonBox";
import { useArgonController } from "context";
import Swal from 'sweetalert2';
import { AuthContext } from "../../AuthContext";
import { OutTable, ExcelRenderer } from "react-excel-renderer";
import * as XLSX from 'xlsx';

function DashCard({ onRefresh, onHighlight }) {
  const [controller] = useArgonController();
  const { darkMode } = controller;
  const [vessels, setVessels] = useState([]);
  const [error, setError] = useState(null);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [dropdownOptions, setDropdownOptions] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVesselData, setSelectedVesselData] = useState(null);
  const { role,id,loginEmail,adminId} = useContext(AuthContext); 
  const [showAddButton, setShowAddButton] = useState(true);

  const [loading, setLoading] = useState(false);
  const [loadingBulkSales, setLoadingBulkSales] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [excelData, setExcelData] = useState({ cols: [], rows: [] });

  const [modalOpenBulkSales, setModalOpenBulkSales] = useState(false);
  const [uploadedData, setUploadedData] = useState([]);

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    
    if (file) {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0]; // Assume the first sheet
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        // Set the uploaded data to the state
        setUploadedData(jsonData);
        console.log(jsonData);
        setModalOpenBulkSales(true); // Open the modal to show data
      };
      
      reader.readAsBinaryString(file);
    }
  };

  const handleAddData = async () => {
    try {
      setModalOpenBulkSales(false); // Close the modal
      setLoadingBulkSales(true);

      const baseURL = process.env.REACT_APP_API_BASE_URL;

      // Prepare requestBody2
      const requestBody2 = uploadedData.map(row => ({
        loginUserId: id,
        email: loginEmail,
        IMO: row.IMO,
        AdminId: adminId,
        OrgId: (role === 'organizational user' || role === 'organization admin') 
          ? (id.includes('_') ? id.split('_')[1] : id.split('_')[0]) 
          : null,
        AddedDate: new Date().toISOString(),
      }));

      // Combine uploadedData and requestBody2
      const combinedData = uploadedData.map((row, index) => ({
        ...row,
        ...requestBody2[index],
      }));

      

      // Send the combined data to the backend API
      await axios.post(`${baseURL}/api/upload-sales-data`, combinedData);
      // location.reload();

      // Display success message
      Swal.fire({
        title: "Success!",
        text: "Bulk Sales Data added successfully.",
        icon: "success",
        confirmButtonText: "OK",
      });
      setLoadingBulkSales(false);
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "Failed to add bulk sales data.",
        icon: "error",
        confirmButtonText: "Retry",
      });
      console.error("Error sending data to the backend:", error);
      setLoadingBulkSales(false);
    }
  }

  useEffect(() => {
    console.log(`dashcard id : ${id}`);
  }, []);
  const handleSearchChange = (value) => {
    setSearchInput(value);
    setPage(1); // Reset page when search input changes
  };

  const handleToggleSearchBar = () => {
    setShowSearchBar((prevShowSearchBar) => !prevShowSearchBar);
  };

  // Extract IMO column values and send to backend
  const handleAddVessels = async () => {
    handleCloseModalExcelUpload();
    setLoading(true); // Start loading spinner
    try{
    const imoIndex = excelData.cols.findIndex(col => col.name === "A");
    if (imoIndex === -1) {
      alert("IMO column not found in the uploaded file.");
      setLoading(false);
      return;
    }

   // Map to get the IMO numbers and filter out non-numeric values
  const imoNumbers = excelData.rows
  .map(row => row[imoIndex])
  .filter(imo => !isNaN(imo));  // Filter out "IMO" or other non-numeric values
 
  const requestBody3 = { 
    loginUserId: id,
    email: loginEmail, 
    AdminId: adminId,
    OrgId: (role === 'organizational user' || role === 'organization admin') 
           ? (id.includes('_') ? id.split('_')[1] : id.split('_')[0]) 
           : null,
    AddedDate: new Date().toISOString(),
  };
    const baseURL = process.env.REACT_APP_API_BASE_URL;
    const response = await axios.post(`${baseURL}/api/add-vessels-bulk`, { imoNumbers, requestBody3 });

    
    handleCloseModalExcelUpload();
    // location.reload();
    // Use SweetAlert2 for success notification
    Swal.fire({
      title: 'Success!',
      text: response.data.message,
      icon: 'success',
      confirmButtonText: 'OK'
    });
  } catch (error) {
    
    console.error("Error adding vessels:", error);
    handleCloseModalExcelUpload();
    // Use SweetAlert2 for error notification
    Swal.fire({
      title: 'Error',
      text: 'Failed to add vessels.',
      icon: 'error',
      confirmButtonText: 'Retry'
    });
  }finally {
    setLoading(false); // Stop loading spinner
  }
  
  };

  const handleExcelUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      ExcelRenderer(file, (err, resp) => {
        if (err) {
          console.error("Error reading Excel file:", err);
        } else {
          setExcelData({
            cols: resp.cols,
            rows: resp.rows,
          });
          setOpenModal(true);
        }
      });
    }
  };
  
  const handleCloseModalExcelUpload = () => setOpenModal(false);
  
  const handleSelectChange = (selectedOption) => {
    if (selectedOption) {
      const vesselData = vessels.find(vessel => vessel.imoNumber === selectedOption.value);
      setSelectedVesselData(vesselData);
      console.log(vesselData)
      setModalOpen(true);
    }
  };
  
  const fetchVesselData = async (imoNumber) => {
    try {
      const baseURL = process.env.REACT_APP_API_BASE_URL;
      const response = await axios.get(`${baseURL}/api/ais-data`, {
        params: { imo: imoNumber }
      });
      setSelectedVesselData(response.data);
      setModalOpen(true);
    } catch (err) {
      console.error("Error fetching vessel data:", err);
    }
  };
  
  

  useEffect(() => {
    const fetchVesselData = async () => {
      try {
        const baseURL = process.env.REACT_APP_API_BASE_URL;
  
        // Step 1: Derive orgId from `id` based on the underscore count
        let orgId = id.includes('_') ? id.split('_')[1] : id.split('_')[0];
       
        // Step 2: Fetch organization data for assignShips count
        const orgResponse = await axios.get(`${baseURL}/api/organizations/getAvailableVessels/${orgId}`);
        
        const assignShips = orgResponse.data?.assignShips || 0;
  
        // Step 3: Fetch all vessels to filter by `orgId`
        const vesselResponse = await axios.get(`${baseURL}/api/get-tracked-vessels`);
        const filteredVessels = vesselResponse.data.filter(vessel =>
          vessel.loginUserId && vessel.loginUserId.includes(orgId)
        );
        
        // Step 4: Compare assignShips with filtered vessels count
        console.log(assignShips);
        console.log(filteredVessels.length);
        setShowAddButton(assignShips > filteredVessels.length);
      } catch (error) {
        console.error('Error fetching vessel or organization data:', error);
      }
    };
  
    // Fetch data only if the user has an organizational role
    if (role === 'organizational user' || role === 'organization admin') {
      fetchVesselData();
    }
  }, [role, id]);

  useEffect(() => {
    const fetchVessels = async () => {
      try {
        const baseURL = process.env.REACT_APP_API_BASE_URL;
        const response = await axios.get(`${baseURL}/api/get-vessels`, {
          params: { search: searchInput, page, limit: 20 }
        });

        if (response.data.vessels.length < 20) {
          setHasMore(false);
        }

        const options = response.data.vessels.map(vessel => ({
          value: vessel.imoNumber,
          label: vessel.transportName + " | " + vessel.SpireTransportType
        }));
        setDropdownOptions(options);

        setVessels(prevVessels => [...prevVessels, ...response.data.vessels]);
      } catch (err) {
        console.error("Error fetching vessel data:", err);
        setError(err.message);
      }
    };

    if (searchInput && showSearchBar) {
      fetchVessels();
    } else {
      setDropdownOptions([]);
    }
  }, [searchInput, showSearchBar, page]);

   // Reset search input and dropdown options when `showAddButton` changes
   useEffect(() => {
    setSearchInput("");
    setDropdownOptions([]);
  }, [showAddButton]);

  const loadMore = () => {
    if (hasMore) {
      setPage(prevPage => prevPage + 1);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedVesselData(null);
  };

  const handleAddToTrack = async () => {
    if (!selectedVesselData) return;
  
    try {
      const baseURL = process.env.REACT_APP_API_BASE_URL; 
      handleCloseModal();
  
      await new Promise(resolve => setTimeout(resolve, 300));
  
      const imoNumber = selectedVesselData.imoNumber;
      // Check if the vessel is already being tracked
      const trackedVesselsResponse = await axios.get(`${baseURL}/api/get-tracked-vessels`);
      console.log(trackedVesselsResponse.data);
      const isAlreadyTracked = trackedVesselsResponse.data.some(doc => doc.IMO === imoNumber);

console.log(isAlreadyTracked);
 
      const result = await Swal.fire({
        title: 'Confirm',
        text: "Are you sure you want to add this vessel to the track?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, add it!',
      });
     
      if (result.isConfirmed) {
        
        const imoNumber = selectedVesselData.imoNumber;
        // Check if the vessel is already being tracked
        const trackedVesselsResponse = await axios.get(`${baseURL}/api/get-tracked-vessels`);
        const isAlreadyTracked = trackedVesselsResponse.data.some(doc => doc.IMO === imoNumber);
  console.log(isAlreadyTracked);
        const requestBody2 = { 
          loginUserId: id,
          email: loginEmail, 
          IMO: imoNumber,
          AdminId: adminId,
          OrgId: (role === 'organizational user' || role === 'organization admin') 
                 ? (id.includes('_') ? id.split('_')[1] : id.split('_')[0]) 
                 : null,
          AddedDate: new Date().toISOString(),
        };
  
        if (isAlreadyTracked) {
          
          try {
            console.log(requestBody2);
            await axios.post(`${baseURL}/api/add-vessel-tracked-by-user`, requestBody2);
            console.log(requestBody2);
            Swal.fire({
              title: 'Success',
              text: 'Vessel added to track successfully!',
              icon: 'success',
              confirmButtonColor: '#3085d6',
            });
          } catch (error) {
            console.error('Error posting to add-vessel-tracked-by-user:', error.response ? error.response.data : error.message);
          }
        } else {
          // Fetch AIS data and add combined data
          const aisResponse = await axios.get(`${baseURL}/api/ais-data`, {
            params: { imo: imoNumber }
          });
          console.log(aisResponse);
  
          const requestBody = {
            IMO: imoNumber,
            ...aisResponse.data,
            SpireTransportType: selectedVesselData.SpireTransportType,
            FLAG: selectedVesselData.FLAG,
            GrossTonnage: selectedVesselData.GrossTonnage,
            deadWeight: selectedVesselData.deadWeight,
            email: loginEmail,
          };
          const token = localStorage.getItem('token');
          await axios.post(`${baseURL}/api/add-combined-data`, requestBody);
          console.log('Combined data added successfully');
  
          if (onRefresh) onRefresh();
          if (onHighlight) onHighlight({
            imo: imoNumber,
            lat: aisResponse.data[0].AIS.LATITUDE,
            lng: aisResponse.data[0].AIS.LONGITUDE,
            name: aisResponse.data[0].AIS.NAME,
            eta: aisResponse.data[0].AIS.ETA,
            destination: aisResponse.data[0].AIS.DESTINATION
          });
  
          Swal.fire({
            title: 'Success',
            text: 'Vessel added to track successfully!',
            icon: 'success',
            confirmButtonColor: '#3085d6',
          });
  
          try {
            await axios.post(`${baseURL}/api/add-vessel-tracked-by-user`, requestBody2);
            console.log(requestBody2);
          } catch (error) {
            console.error('Error posting to add-vessel-tracked-by-user:', error.response ? error.response.data : error.message);
          }
        }
      }
    } catch (error) {
      console.error('Error adding data to track:', error);
    }
  };
  

  return (
    <ArgonBox>

      {/* Full-page Loading Spinner Overlay */}
{loading && (
  <Box
    position="fixed"
    top={0}
    left={0}
    right={0}
    bottom={0}
    bgcolor="rgba(255, 255, 255, 0.5)"
    display="flex"
    flexDirection="column-reverse"  // Reverses the order of the spinner and text
    alignItems="center"
    justifyContent="center"
    zIndex={9999}
  >
     <Typography 
      variant="h6" 
      align="center" 
      gutterBottom 
      mt={2} // Adds a margin-top to the Typography for better spacing
      aria-live="polite"
    >
      Please wait! Vessels are being added...
    </Typography>
    <CircularProgress color="primary" size={60} />
   
  </Box>
)}



{loadingBulkSales && (
  <Box
    position="fixed"
    top={0}
    left={0}
    right={0}
    bottom={0}
    bgcolor="rgba(255, 255, 255, 0.5)"
    display="flex"
    flexDirection="column-reverse"  // Reverses the order of the spinner and text
    alignItems="center"
    justifyContent="center"
    zIndex={9999}
  >
     <Typography 
      variant="h6" 
      align="center" 
      gutterBottom 
      mt={2} // Adds a margin-top to the Typography for better spacing
      aria-live="polite"
    >
      Please wait! Sales Data are being added...
    </Typography>
    <CircularProgress color="primary" size={60} />
   
  </Box>
)}
      
      <ArgonBox p={0}>
        <Grid container alignItems="center" justifyContent="space-between" spacing={0}>
          <Grid item xs={12} lg={6} style={{ display: "flex", justifyContent: "left" }}>
            <h3 style={{ margin: 0 }}>Vessel Details</h3>
          </Grid>

          {showSearchBar && (
            <Grid item xs={12} lg={2.8}  >
              <Select
                options={dropdownOptions}
                placeholder="Select vessel"
                onInputChange={handleSearchChange}
                onChange={handleSelectChange}
                isSearchable={true}
                isClearable={true}
              />


            </Grid>
          )}

<Grid item xs={12} lg={3} gap={0.5} style={{ display: "flex",flexDirection: window.innerWidth < 600 ? "column" : "row",   justifyContent: "flex-end" }}>
    {showAddButton &&   (
      <Button
        variant="contained"
        color="primary"
        startIcon={<Icon>add</Icon>}
        style={{
          backgroundColor: "#0F67B1",
          color: "white",
          borderRadius: "5px",
          padding: "4px 6px",
        }}
        onClick={handleToggleSearchBar}
      >
        Add Vessel
      </Button>
    )}
  

      
      {/* start */}
      <input
        type="file"
        accept=".xlsx, .xls"
        style={{ display: "none" }}
        id="excel-upload"
        onChange={handleExcelUpload}
      />
      <label htmlFor="excel-upload">
        <Button
          variant="contained"
          color="primary"
          // startIcon={<Icon>upload_file</Icon>}
          style={{
            backgroundColor: "#0F67B1",
            color: "white",
            borderRadius: "5px",
            padding: "4px 6px",
          }}
          component="span"
        >
         OPS Upload
        </Button>
      </label>

      {/* bulk sales */}

      <label htmlFor="file-upload" style={{ cursor: "pointer" }}>
        <Button
          variant="contained"
          color="primary"
          // startIcon={<Icon>upload_file</Icon>}
          style={{
            backgroundColor: "#0F67B1",
            color: "white",
            borderRadius: "5px",
            padding: "4px 6px",
          }}
          component="span"
        
        >
         Sales Upload
        </Button>
      </label>
      <input
        type="file"
        accept=".xlsx, .xls"
        style={{ display: 'none' }}
        id="file-upload"
        onChange={handleFileUpload}
      />


      {/* bulk sales */}

    

      <Modal open={openModal} onClose={handleCloseModalExcelUpload}>
  <Box
    sx={{
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      bgcolor: "background.paper",
      boxShadow: 24,
      p: 4,
      maxHeight: "80vh",
      overflow: "auto",
      borderRadius: "12px", // Rounded corners for the modal
    }}
  >
    <Typography variant="h6" component="h2" gutterBottom>
      Excel File Data
    </Typography>

    {/* Table of Excel Data */}
    <Box sx={{ mb: 2 }}>
      <OutTable
        data={excelData.rows}
        columns={excelData.cols}
        tableClassName="ExcelTable2007"
        tableHeaderRowClass="heading"
        sx={{
          width: "100%",
          borderCollapse: "collapse",
          "& .ExcelTable2007": {
            width: "100%",
            border: "1px solid #ccc",
            borderRadius: "8px", // Rounded corners for the table
            overflow: "hidden",
          },
          "& th, & td": {
            padding: "8px 16px",
            textAlign: "left",
            borderBottom: "1px solid #ddd",
          },
          "& th": {
            backgroundColor: "#f4f4f4",
            fontWeight: "bold",
          },
          "& tr:hover": {
            backgroundColor: "#f1f1f1",
          },
        }}
      />
    </Box>

    {/* Add Vessels Button aligned to the right */}
    <Box sx={{ textAlign: "right" }}>
      <Button
        variant="contained"
        color="secondary"
        onClick={handleAddVessels}
        style={{ marginTop: "20px", borderRadius: "8px" }} // Rounded corners for button
      >
        Add Vessels(Bulk)
      </Button>
    </Box>
  </Box>
</Modal>

  {/* bulk sales model starts */}

  <Modal
        open={modalOpenBulkSales}
        onClose={() => setModalOpenBulkSales(false)}
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
         <Box
    sx={{
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      bgcolor: "background.paper",
      boxShadow: 24,
      p: 4,
      maxHeight: "80vh",
      overflow: "auto",
      borderRadius: "12px", // Rounded corners for the modal
    }}
  >
          <h2 id="modal-title">Uploaded Data</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: "8px", border: "1px solid #ddd" }}>Sales Quotation Number</th>
                <th style={{ padding: "8px", border: "1px solid #ddd" }}>Case ID</th>
                <th style={{ padding: "8px", border: "1px solid #ddd" }}>Sales Responsible</th>
                <th style={{ padding: "8px", border: "1px solid #ddd" }}>Customer Owner</th>
                <th style={{ padding: "8px", border: "1px solid #ddd" }}>Vessel Name</th>
                <th style={{ padding: "8px", border: "1px solid #ddd" }}>IMO</th>
                <th style={{ padding: "8px", border: "1px solid #ddd" }}>Priority</th>
                <th style={{ padding: "8px", border: "1px solid #ddd" }}>Date Of Last Sent Quote</th>
              </tr>
            </thead>
            <tbody>
              {uploadedData.map((row, index) => (
                <tr key={index}>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{row.SalesQuotationNumber}</td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{row.CaseId}</td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{row.SalesResponsible}</td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{row.CustomerOwner}</td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{row.VesselName}</td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{row.IMO}</td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{row.Priority}</td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{row.DateOfLastSentQuote}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button onClick={handleAddData} variant="contained" sx={{ mt: 2 }}>
            Add
          </Button>
        </Box>
      </Modal>

      {/* bulk sales model ends */}




      {/* end */}
  </Grid>
        </Grid>
      </ArgonBox>

      <Dialog open={modalOpen} onClose={handleCloseModal}>
        <DialogTitle>Vessel Information</DialogTitle>
        <DialogContent>
          {selectedVesselData ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px', border: '1px solid #ccc' }}>IMO Number</th>
                  <th style={{ padding: '8px', border: '1px solid #ccc' }}>Vessel Type</th>
                  <th style={{ padding: '8px', border: '1px solid #ccc' }}>Vessel Name</th>
                  <th style={{ padding: '8px', border: '1px solid #ccc' }}>Deadweight</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>{selectedVesselData.imoNumber}</td>
                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>{selectedVesselData.SpireTransportType}</td>
                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>{selectedVesselData.transportName}</td>
                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>{selectedVesselData.deadWeight}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p>No data available</p>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="primary">Close</Button>
          <Button onClick={handleAddToTrack} color="primary">Add to Track</Button>
        </DialogActions>
      </Dialog>
    </ArgonBox>
  );
}

DashCard.propTypes = {
  onRefresh: PropTypes.func.isRequired,
  onHighlight: PropTypes.func.isRequired,
};

export default DashCard;
