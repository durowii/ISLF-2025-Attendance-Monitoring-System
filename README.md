# ISLF Attendance Record System

A beautiful, modern web application for scanning QR codes to record attendance with automatic timestamping and CSV export functionality. Features an elegant design with glassmorphism effects and a professional ISLF branded interface.

## 🎯 Project Goals

- **Real-time QR Code Scanning**: Use device camera (front/back) to scan QR codes
- **Attendance Tracking**: Automatically record name, country, and timestamp
- **Data Export**: Generate CSV files with all attendance data including scan times
- **Responsive Design**: Works on desktop and mobile devices
- **Offline-First**: All data stored locally with persistent storage

## ✅ Currently Completed Features

### Core Functionality
- ✅ **Enhanced QR Scanner**: Ultra-fast real-time QR code detection with optimized performance
- ✅ **Flexible Camera Control**: User can switch between front and back camera anytime
- ✅ **Lightning Fast Detection**: 25ms scan intervals with optimized canvas processing
- ✅ **Mirrored Camera**: Intuitive QR positioning with horizontally flipped camera view
- ✅ **Duplicate Prevention**: Automatically blocks re-scanning of already recorded QR codes
- ✅ **Multi-Sensory Feedback**: Audio beep + visual checkmark + status updates for instant confirmation
- ✅ **Auto Export & Reset**: Prompts to download CSV and clear all data when stopping scanner
- ✅ **Data Parsing**: Supports multiple QR code formats for name and country
- ✅ **Attendance Storage**: Saves records to local database with timestamps
- ✅ **Real-time Display**: Shows scanned records immediately in a responsive table

### User Interface
- ✅ **Responsive Design**: Mobile-friendly interface using Tailwind CSS
- ✅ **Camera Controls**: Start/Stop scanner with visual feedback
- ✅ **Scan Results Display**: Shows parsed QR data with visual confirmation
- ✅ **Attendance Table**: Sortable table with delete functionality
- ✅ **Export Button**: One-click CSV download with formatted timestamps
- ✅ **Status Messages**: Real-time feedback for all operations

### Data Management
- ✅ **RESTful API Integration**: Uses built-in Table API for CRUD operations
- ✅ **Duplicate Prevention**: 3-second cooldown to prevent duplicate scans
- ✅ **Data Persistence**: All records saved with system-generated IDs
- ✅ **Timestamp Recording**: Precise scan time recording and display

## 🔧 Functional Entry Points

### Main Application
- **URL**: `index.html`
- **Purpose**: Main QR scanner interface with all functionality

### API Endpoints (RESTful Table API)
- **GET** `tables/attendance` - List all attendance records
  - Parameters: `page`, `limit`, `sort`, `search`
- **POST** `tables/attendance` - Create new attendance record
- **DELETE** `tables/attendance/{id}` - Delete specific record

## 📋 Data Models

### Attendance Table Schema
```javascript
{
  id: "string",              // Unique record identifier (UUID)
  name: "string",            // Participant name from QR code
  country: "string",         // Participant country from QR code
  scan_timestamp: "datetime", // When the QR was scanned
  raw_qr_data: "string",     // Original QR code content
  created_at: "number",      // System creation timestamp
  updated_at: "number"       // System update timestamp
}
```

## 📱 Supported QR Code Formats

The scanner supports multiple QR code formats for maximum compatibility:

1. **Primary Format**: `LAST NAME, First Name, Country` (e.g., `DOE, John, USA`)
2. **Labeled Format**: `Name: John Doe, Country: USA`
3. **Simple CSV**: `John Doe, USA`
4. **JSON Format**: `{"lastName": "DOE", "firstName": "John", "country": "USA"}`
5. **Multi-line**: 
   ```
   DOE
   John
   USA
   ```

## 🎮 How to Use

### For Event Organizers:
1. **Setup**: Open the web app on a device with camera access
2. **Start Scanning**: Click "Start Scanner" to begin QR code detection
3. **Position QR Codes**: Hold QR codes within the scanner frame overlay
4. **Monitor Attendance**: View real-time attendance records in the table
5. **Export Data**: Click "Export CSV" to download attendance records

### For Participants:
1. **Generate QR Codes**: Create QR codes in the format "LAST NAME, First Name, Country" (e.g., "SMITH, John, USA")
2. **Present Code**: Show your QR code to the scanner device
3. **Confirmation**: Wait for scan confirmation with green checkmark animation

## 📊 CSV Export Features

- **Comprehensive Data**: Includes No., Name, Country, Scan Date, Scan Time, Full Timestamp
- **Sorted Records**: Newest scans first for easy review
- **Formatted Timestamps**: Separate date and time columns plus full timestamp
- **Automatic Naming**: Files named with export timestamp for organization
- **CSV Compliance**: Properly escaped data for Excel/Google Sheets compatibility

## 🎨 Design Features

### Visual Excellence
- **Glassmorphism Effects**: Frosted glass cards with backdrop blur
- **Gradient Background**: Beautiful blue gradient with depth
- **Smooth Animations**: Hover effects, transitions, and loading animations
- **Professional Branding**: ISLF header logo and consistent color theming
- **Responsive Layout**: Optimized for all device sizes
- **Enhanced Scanner UI**: Animated scanner frame, focus indicators, and scanning line
- **Intuitive UX**: Mirrored camera, success animations, improved button states

### Scanning Performance
- **Ultra-Fast Detection**: 25ms scan intervals with optimized single-pass algorithm
- **Smart Canvas Scaling**: Automatically optimizes video processing for maximum speed
- **Instant Feedback**: Audio beep + visual checkmark + 1-second scanner pause for confirmation
- **Perfect Circle UI**: Fixed aspect ratio success/error overlays for professional appearance
- **HD Camera Support**: Requests up to 1920x1080 resolution with intelligent downscaling
- **Duplicate Prevention**: Comprehensive blocking of already-scanned QR codes with visual feedback
- **Auto Session Management**: Prompts for CSV export and automatic data reset when stopping

### Session Workflow
- **Start Scanner**: Loads existing records and initializes duplicate prevention (defaults to back camera)
- **Switch Camera**: Toggle between front and back camera anytime during scanning
- **Scan QR Codes**: Instant audio/visual feedback with automatic attendance recording
- **Stop Scanner**: Auto-prompts to download CSV and clear all data for next session
- **Perfect Reset**: Completely clears attendance records and duplicate prevention for fresh start

### Camera Controls
- **Default**: Starts with back camera (environment) for optimal QR scanning
- **Switch Button**: Toggle to front camera (user) or back to rear camera anytime
- **Smart Fallback**: Automatically tries alternative camera if preferred one fails
- **Live Switching**: Change cameras without stopping the scanner session

## 🔧 Technical Implementation

### Frontend Technologies
- **HTML5**: Semantic structure with camera API support
- **Tailwind CSS + Custom CSS**: Responsive styling with modern ISLF color scheme
- **Glassmorphism Design**: Beautiful frosted glass effects and gradient backgrounds
- **Color Palette**: #AF751D, #485867, #897142, #D89327, #2F4E6F
- **Vanilla JavaScript**: ES6+ for scanner logic and API interactions
- **jsQR Library**: QR code detection and parsing
- **Font Awesome**: Icon library for UI elements
- **ISLF Branding**: Professional header logo and consistent theming

### Browser Requirements
- **Camera Access**: Requires `getUserMedia` API support
- **Modern Browser**: Chrome 53+, Firefox 36+, Safari 11+, Edge 12+
- **HTTPS**: Required for camera access in production

### Storage
- **RESTful Table API**: Built-in database with CRUD operations
- **Local Processing**: All QR parsing and validation done client-side
- **Persistent Storage**: Data survives browser sessions

## 🚀 Features Not Yet Implemented

### Potential Enhancements
- ❌ **Bulk QR Generation**: Tool to generate QR codes for participant lists
- ❌ **Real-time Sync**: Live updates across multiple scanner devices  
- ❌ **Advanced Reporting**: Charts and analytics for attendance data
- ❌ **Print Functionality**: Printable attendance reports
- ❌ **Data Import**: Import participant lists from CSV/Excel
- ❌ **Custom Fields**: Additional data fields beyond name/country
- ❌ **Multiple Events**: Support for separate event attendance tracking
- ❌ **Backup/Restore**: Data backup and restore functionality

### Integration Limitations
- ❌ **Direct Google Sheets**: Cannot auto-upload to Google Sheets (requires manual CSV import)
- ❌ **Real-time Collaboration**: No multi-device synchronization
- ❌ **Cloud Backup**: No automatic cloud storage (export required)

## 📈 Recommended Next Steps

### Phase 1: Enhanced User Experience
1. **Bulk QR Generator**: Add tool to generate QR codes for participant lists
2. **Event Management**: Support multiple events with separate attendance tracking
3. **Advanced Filtering**: Add date range and search filters for records
4. **Print Reports**: Add printable attendance summary reports

### Phase 2: Data Management
1. **Import Functionality**: Allow CSV import of participant lists
2. **Custom Fields**: Support additional data fields (email, organization, etc.)
3. **Backup/Restore**: Add data export/import for full database backup
4. **Data Validation**: Enhanced QR format validation and error handling

### Phase 3: Analytics
1. **Attendance Analytics**: Charts showing attendance patterns
2. **Export Options**: Multiple export formats (Excel, PDF, etc.)
3. **Real-time Stats**: Live dashboard with attendance counters
4. **Historical Reports**: Time-based attendance analysis

## 🏗️ Architecture

```
ISLF Attendance System/
├── index.html              # Main application interface
├── css/
│   └── styles.css         # Custom styling with ISLF branding and glassmorphism
├── js/
│   └── scanner.js         # QR scanner logic and API integration
├── images/
│   ├── islf-header.png    # ISLF branded header logo
│   └── logo.png          # Original logo (unused)
└── README.md              # Project documentation
```

## 🎉 Getting Started

1. **Access the App**: Open `index.html` in a modern web browser
2. **Grant Permissions**: Allow camera access when prompted
3. **Test Scanning**: Create a test QR code with format: "SMITH, John, USA"
4. **Start Scanning**: Click "Start Scanner" and position QR codes in frame (camera is mirrored for easier use)
5. **Export Data**: Use "Export CSV" to download attendance records

---

**Note**: This is a static web application that works entirely in the browser. For deployment, simply upload files to any web server or use the Publish tab for instant deployment.

**Camera Requirements**: HTTPS is required for camera access in production environments. The app will work on `localhost` for development and testing.