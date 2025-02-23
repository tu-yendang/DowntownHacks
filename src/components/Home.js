import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAnnouncements } from "../utils/api";
import { fetchLocationAddress } from "../utils/geocode";
import AnnouncementList from "./AnnouncementList";
import ReportModal from "./ReportModal";
import styles from "./styles/Home.module.css";

const Home = ({ user, onLogout, userLocation }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [locations, setLocations] = useState({});
  const [filters, setFilters] = useState({ eventType: "", startTime: "" });
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [userCity, setUserCity] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (userLocation) {
      const fetchUserCity = async () => {
        try {
          const address = await fetchLocationAddress(userLocation.latitude, userLocation.longitude);
          setUserCity(address.city || address.locality || "Your Location");
          console.log("City: ", address.city);
        } catch (error) {
          console.error("Failed to fetch user city:", error);
          setUserCity("Your Location");
        }
      };
      fetchUserCity();
    }
  }, [userLocation]);

  // Fetch announcements based on filters and user location
  useEffect(() => {
    if (userLocation) {
      const fetchData = async () => {
        try {
          const data = await fetchAnnouncements({
            ...filters,
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          });
  
          const now = new Date();
  
          const filteredData = data.filter((announcement) => {
            const startTime = new Date(announcement.startTime);
            const endTime = announcement.endTime ? new Date(announcement.endTime) : null;
  
            if (endTime) {
              return endTime > now;
            } else {
              return now - startTime <= 24 * 60 * 60 * 1000;
            }
          });
  
          setAnnouncements(filteredData);
          fetchLocations(filteredData);
        } catch (error) {
          console.error("Failed to fetch announcements:", error);
        }
      };
  
      fetchData();
    }
  }, [filters, userLocation]);
  
  const fetchLocations = async (announcements) => {
    const newLocations = {};
    for (const announcement of announcements) {
      if (announcement.longitude && announcement.latitude) {
        try {
          const address = await fetchLocationAddress(announcement.latitude, announcement.longitude);
          newLocations[announcement._id] = address;
        } catch (error) {
          console.error("Failed to fetch address for announcement:", error);
          newLocations[announcement._id] = "Unknown Location";
        }
      }
    }
    setLocations(newLocations);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prevFilters) => ({ ...prevFilters, [name]: value }));
  };

  const handleFilterSubmit = () => {
    if (!filters.eventType && !filters.startTime) {
      alert("Please fill at least one filter to apply.");
      return;
    }
    fetchAnnouncements({
      ...filters,
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
    }).then((data) => {
      setAnnouncements(data);
      fetchLocations(data);
    });
  };

  const handleReportClick = (announcement) => {
    setSelectedAnnouncement(announcement);
    setReportModalVisible(true);
  };

  const handleReportSubmit = () => {
    console.log(`Reported Announcement ID: ${selectedAnnouncement._id}`);
    console.log(`Reason: ${reportReason}`);
    setReportModalVisible(false);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Welcome, {user.name}!</h1>
        <button onClick={onLogout}>Logout</button>
        <button onClick={() => navigate("/create-announcement")}>Create Announcement</button>
        <button onClick={() => navigate("/map")}>Map</button>
      </header>

      {/* Filter Form */}
      <div>
        <h2>Filter Announcements</h2>
        <div>
          <label>Event Type:</label>
          <select name="eventType" value={filters.eventType} onChange={handleFilterChange}>
            <option value="All">All</option>
            <option value="Safety Alerts">Safety Alerts</option>
            <option value="Local Events">Local Events</option>
            <option value="Outdoor Activities">Outdoor Activities</option>
            <option value="Volunteer">Volunteer</option>
            <option value="Health">Health</option>
            <option value="Family & Kids">Family & Kids</option>
            <option value="Networking">Networking</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label>Events Starting At or Later:</label>
          <input
            type="datetime-local"
            name="startTime"
            value={filters.startTime}
            onChange={handleFilterChange}
          />
        </div>
        <button onClick={handleFilterSubmit}>Filter</button>
      </div>

      {/* Display user's city location alongside the Announcements heading */}
      <h1>
        Announcements {userCity && <span>(Near {userCity})</span>}
      </h1>

      {/* Announcement List */}
      <AnnouncementList
        announcements={announcements}
        locations={locations}
        onReportClick={handleReportClick}
      />

      {/* Report Modal */}
      <ReportModal
        isVisible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleReportSubmit}
        reportReason={reportReason}
        setReportReason={setReportReason}
      />
    </div>
  );
};

export default Home;