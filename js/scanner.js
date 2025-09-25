class QRAttendanceScanner {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.scanning = false;
        this.stream = null;
        this.scanInterval = null;
        this.lastScannedCode = null;
        this.lastScanTime = 0;
        this.scanCooldown = 2000; // 2 seconds cooldown between same QR scans
        this.useLocalStorage = false; // Will switch to true if API fails
        this.scanAttempts = 0; // Track scanning attempts for status updates
        this.scannedQRCodes = new Set(); // Track all scanned QR codes to prevent duplicates
        this.currentCamera = 'environment'; // Track current camera: 'environment' or 'user'

        this.initializeElements();
        this.bindEvents();
        this.loadAttendanceRecords();
    }

    initializeElements() {
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.switchCameraBtn = document.getElementById('switchCameraBtn');
        this.scanResult = document.getElementById('scanResult');
        this.status = document.getElementById('status');
        this.attendanceTable = document.getElementById('attendanceTable');
        this.recordCount = document.getElementById('recordCount');
        this.exportBtn = document.getElementById('exportBtn');
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startScanner());
        this.stopBtn.addEventListener('click', () => this.stopScanner());
        this.switchCameraBtn.addEventListener('click', () => this.switchCamera());
        this.exportBtn.addEventListener('click', () => this.exportToCSV());
        
        // Test button - also run diagnostics
        document.getElementById('manualBtn').addEventListener('click', () => {
            this.diagnoseScanner();
            this.addTestRecord();
        });
        
        // Clear duplicate prevention button
        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearScannedQRCodes();
        });
        
        // Add debugging for video events
        this.video.addEventListener('loadeddata', () => {
            console.log('Video loadeddata event fired');
        });
        
        this.video.addEventListener('canplay', () => {
            console.log('Video canplay event fired');
        });
    }

    async startScanner() {
        try {
            this.updateStatus('Starting camera...');
            
            // Request camera access with optimized settings for QR scanning
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: this.currentCamera,
                    width: { ideal: 1920, min: 640 },
                    height: { ideal: 1080, min: 480 },
                    frameRate: { ideal: 30, min: 15 }
                }
            });

            this.video.srcObject = this.stream;
            
            this.video.onloadedmetadata = () => {
                // Optimize canvas size for performance while maintaining quality
                const maxSize = 800;
                const scale = Math.min(maxSize / this.video.videoWidth, maxSize / this.video.videoHeight, 1);
                
                this.canvas.width = this.video.videoWidth * scale;
                this.canvas.height = this.video.videoHeight * scale;
                
                console.log('Video loaded:', this.video.videoWidth, 'x', this.video.videoHeight);
                console.log('Canvas optimized to:', this.canvas.width, 'x', this.canvas.height);
                this.startScanning();
            };

            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.switchCameraBtn.disabled = false;
            const cameraName = this.currentCamera === 'environment' ? 'Back' : 'Front';
            this.updateStatus(`${cameraName} camera started. Position QR code within the frame.`);

        } catch (error) {
            console.error('Error accessing camera:', error);
            
            // Fallback to opposite camera
            const fallbackCamera = this.currentCamera === 'environment' ? 'user' : 'environment';
            try {
                this.stream = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        facingMode: fallbackCamera,
                        width: { ideal: 1920, min: 640 },
                        height: { ideal: 1080, min: 480 },
                        frameRate: { ideal: 30, min: 15 }
                    }
                });
                
                this.video.srcObject = this.stream;
                this.video.onloadedmetadata = () => {
                    // Optimize canvas size for performance
                    const maxSize = 800;
                    const scale = Math.min(maxSize / this.video.videoWidth, maxSize / this.video.videoHeight, 1);
                    
                    this.canvas.width = this.video.videoWidth * scale;
                    this.canvas.height = this.video.videoHeight * scale;
                    this.startScanning();
                };

                this.currentCamera = fallbackCamera;
                this.startBtn.disabled = true;
                this.stopBtn.disabled = false;
                this.switchCameraBtn.disabled = false;
                const cameraName = fallbackCamera === 'environment' ? 'Back' : 'Front';
                this.updateStatus(`${cameraName} camera started (fallback). Position QR code within the frame.`);

            } catch (fallbackError) {
                this.updateStatus('Error: Unable to access camera. Please check permissions.');
                console.error('Fallback camera error:', fallbackError);
                this.switchCameraBtn.disabled = true;
            }
        }
    }

    startScanning() {
        this.scanning = true;
        this.scanAttempts = 0;
        console.log('Starting optimized QR scanning...');
        this.scanInterval = setInterval(() => {
            this.scanFrame();
        }, 25); // Scan every 25ms for very fast detection
        this.updateStatus('🔍 Scanning for QR codes...');
    }

    async stopScanner() {
        this.scanning = false;
        this.scanAttempts = 0;
        
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        this.video.srcObject = null;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.switchCameraBtn.disabled = true;
        
        const qrCount = this.scannedQRCodes.size;
        
        // If there are attendance records, prompt for CSV download and reset
        if (qrCount > 0) {
            const shouldDownload = confirm(`Scanner stopped with ${qrCount} attendance records.\n\nDownload CSV file and clear all data?`);
            
            if (shouldDownload) {
                this.updateStatus('📥 Exporting CSV and clearing data...');
                
                // Export CSV
                await this.exportToCSV();
                
                // Clear all attendance data
                await this.clearAllAttendance();
                
                this.updateStatus(`✅ CSV downloaded and ${qrCount} records cleared. Ready for next session.`);
            } else {
                this.updateStatus(`📹 Scanner stopped. ${qrCount} records preserved.`);
            }
        } else {
            this.updateStatus('📹 Scanner stopped. No attendance records to export.');
        }
    }

    async switchCamera() {
        if (!this.scanning) {
            // If scanner is not running, just toggle the setting
            this.currentCamera = this.currentCamera === 'environment' ? 'user' : 'environment';
            const cameraName = this.currentCamera === 'environment' ? 'Back' : 'Front';
            this.updateStatus(`Camera switched to ${cameraName}. Click "Start Scanner" to begin.`);
            return;
        }

        try {
            this.updateStatus('🔄 Switching camera...');
            
            // Stop current stream
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }
            
            // Toggle camera
            this.currentCamera = this.currentCamera === 'environment' ? 'user' : 'environment';
            
            // Start new camera
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: this.currentCamera,
                    width: { ideal: 1920, min: 640 },
                    height: { ideal: 1080, min: 480 },
                    frameRate: { ideal: 30, min: 15 }
                }
            });

            this.video.srcObject = this.stream;
            this.video.onloadedmetadata = () => {
                // Optimize canvas size for performance
                const maxSize = 800;
                const scale = Math.min(maxSize / this.video.videoWidth, maxSize / this.video.videoHeight, 1);
                
                this.canvas.width = this.video.videoWidth * scale;
                this.canvas.height = this.video.videoHeight * scale;
                
                const cameraName = this.currentCamera === 'environment' ? 'Back' : 'Front';
                this.updateStatus(`✅ Switched to ${cameraName} camera. Scanning active.`);
            };

        } catch (error) {
            console.error('Error switching camera:', error);
            // Revert camera setting
            this.currentCamera = this.currentCamera === 'environment' ? 'user' : 'environment';
            this.updateStatus('❌ Camera switch failed. Using previous camera.');
            
            // Try to restart with original camera
            this.startScanner();
        }
    }

    scanFrame() {
        if (!this.scanning || this.video.readyState !== this.video.HAVE_ENOUGH_DATA) {
            return;
        }

        try {
            this.scanAttempts++;
            
            // Draw the current video frame to optimized canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            
            // Fast QR detection with minimal options for speed
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });
            
            if (code) {
                console.log('QR Code detected:', code.data);
                this.handleQRDetected(code.data);
            }
            
        } catch (error) {
            console.error('Error in scanFrame:', error);
        }
    }



    handleQRDetected(qrData) {
        const now = Date.now();
        
        // Prevent rapid duplicate scans within cooldown period
        if (this.lastScannedCode === qrData && (now - this.lastScanTime) < this.scanCooldown) {
            return;
        }

        // Check if this QR code has already been scanned in this session
        if (this.scannedQRCodes.has(qrData)) {
            this.showDuplicateError(qrData);
            return;
        }

        // Temporarily pause scanning for immediate feedback
        this.scanning = false;
        
        this.lastScannedCode = qrData;
        this.lastScanTime = now;

        console.log('New QR Code detected:', qrData);
        this.processQRData(qrData);
        
        // Resume scanning after processing
        setTimeout(() => {
            this.scanning = true;
        }, 1000);
    }

    showDuplicateError(qrData) {
        // Show duplicate scan error with visual feedback
        this.displayError('QR Code Already Scanned!', 'This attendance has already been recorded in this session.');
        this.updateStatus('❌ Duplicate QR code - already scanned');
        
        // Brief visual indication with perfect circle
        const overlay = document.getElementById('scanSuccessOverlay');
        overlay.innerHTML = '<i class="fas fa-times"></i>';
        overlay.style.background = 'rgba(220, 38, 127, 0.95)';
        overlay.style.borderColor = 'white';
        overlay.classList.add('show');
        
        setTimeout(() => {
            overlay.classList.remove('show');
            overlay.innerHTML = '<i class="fas fa-check"></i>';
            overlay.style.background = 'rgba(175, 117, 29, 0.95)';
            overlay.style.borderColor = 'white';
            this.updateStatus('🔍 Ready to scan next QR code...');
        }, 2000);
        
        console.log('Duplicate QR code blocked:', qrData);
    }

    processQRData(qrData) {
        try {
            // Parse QR data - expecting format "LAST NAME, First Name, Country"
            const parsedData = this.parseQRContent(qrData);
            
            if (parsedData.name && parsedData.country) {
                // Show immediate success feedback
                this.showScanSuccess();
                
                // Add to scanned QR codes set to prevent future duplicates
                this.scannedQRCodes.add(qrData);
                
                // Process the attendance record
                this.saveAttendance(parsedData.name, parsedData.country, qrData);
                this.displayScanResult(parsedData, qrData);
                
                // Update status after success animation
                setTimeout(() => {
                    this.updateStatus(`✅ Attendance recorded for ${parsedData.name}`);
                }, 500);
            } else {
                this.displayError('Invalid QR Format', 'Expected format: "LAST NAME, First Name, Country"');
                this.updateStatus('❌ Invalid QR code format');
            }
        } catch (error) {
            console.error('Error processing QR data:', error);
            this.displayError('Processing Error', 'Unable to process QR code data');
            this.updateStatus('❌ Error processing QR code');
        }
    }

    showScanSuccess() {
        // Audio feedback for immediate response
        this.playSuccessSound();
        
        // Visual overlay feedback with perfect circle
        const overlay = document.getElementById('scanSuccessOverlay');
        overlay.innerHTML = '<i class="fas fa-check"></i>';
        overlay.style.background = 'rgba(175, 117, 29, 0.95)';
        overlay.style.borderColor = 'white';
        overlay.classList.add('show');
        
        // Immediate status feedback
        this.updateStatus('✅ QR Code Successfully Scanned!');
        console.log('✅ Success animation and sound triggered');
        
        // Reset scan attempts counter
        this.scanAttempts = 0;
        
        // Hide overlay after showing success
        setTimeout(() => {
            overlay.classList.remove('show');
            this.updateStatus('🔍 Ready to scan next QR code...');
        }, 2000);
    }

    playSuccessSound() {
        try {
            // Create a simple success beep
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            console.log('Audio feedback not available:', error);
        }
    }

    parseQRContent(qrData) {
        let name = '';
        let country = '';

        // Try different parsing strategies
        
        // Strategy 1: "LAST NAME, First Name, Country" (primary format)
        const threePartMatch = qrData.match(/^([^,]+),\s*([^,]+),\s*(.+)$/);
        if (threePartMatch) {
            const lastName = threePartMatch[1].trim();
            const firstName = threePartMatch[2].trim();
            name = `${lastName}, ${firstName}`;
            country = threePartMatch[3].trim();
            return { name, country };
        }

        // Strategy 2: "Name: John Doe, Country: USA"
        const labeledMatch = qrData.match(/Name:\s*([^,]+),\s*Country:\s*(.+)/i);
        if (labeledMatch) {
            name = labeledMatch[1].trim();
            country = labeledMatch[2].trim();
            return { name, country };
        }

        // Strategy 3: "John Doe, USA" (simple two-part comma separation)
        const simpleMatch = qrData.match(/^([^,]+),\s*(.+)$/);
        if (simpleMatch) {
            name = simpleMatch[1].trim();
            country = simpleMatch[2].trim();
            return { name, country };
        }

        // Strategy 4: Try JSON format
        try {
            const jsonData = JSON.parse(qrData);
            if (jsonData.name && jsonData.country) {
                return { name: jsonData.name.trim(), country: jsonData.country.trim() };
            }
            if (jsonData.lastName && jsonData.firstName && jsonData.country) {
                name = `${jsonData.lastName.trim()}, ${jsonData.firstName.trim()}`;
                country = jsonData.country.trim();
                return { name, country };
            }
        } catch (e) {
            // Not JSON, continue with other strategies
        }

        // Strategy 5: Split by line breaks
        const lines = qrData.split('\n').filter(line => line.trim());
        if (lines.length >= 3) {
            // Three lines: Last Name, First Name, Country
            name = `${lines[0].trim()}, ${lines[1].trim()}`;
            country = lines[2].trim();
            return { name, country };
        } else if (lines.length >= 2) {
            // Two lines: Full Name, Country
            name = lines[0].trim();
            country = lines[1].trim();
            return { name, country };
        }

        return { name: '', country: '' };
    }

    async saveAttendance(name, country, rawData) {
        const attendanceData = {
            id: this.generateId(),
            name: name,
            country: country,
            scan_timestamp: new Date().toISOString(),
            raw_qr_data: rawData,
            created_at: Date.now(),
            updated_at: Date.now()
        };

        // Try API first, fallback to localStorage
        if (!this.useLocalStorage) {
            try {
                console.log('Attempting to save attendance data via API:', attendanceData);
                this.updateStatus('💾 Saving attendance record...');

                const response = await fetch('tables/attendance', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(attendanceData)
                });

                if (response.ok) {
                    const savedRecord = await response.json();
                    console.log('Attendance saved successfully via API:', savedRecord);
                    this.loadAttendanceRecords();
                    this.updateStatus(`✅ Attendance recorded for ${name}`);
                    return;
                } else {
                    throw new Error(`API Error: HTTP ${response.status}`);
                }
            } catch (error) {
                console.log('API failed, switching to localStorage:', error.message);
                this.useLocalStorage = true;
                this.updateStatus('⚠️ Switched to offline mode - data saved locally');
            }
        }

        // Use localStorage as fallback
        try {
            this.saveToLocalStorage(attendanceData);
            console.log('Attendance saved to localStorage:', attendanceData);
            this.loadAttendanceRecords();
            this.updateStatus(`✅ Attendance recorded for ${name} (offline mode)`);
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            this.updateStatus(`❌ Error saving attendance: ${error.message}`);
            this.displayError(`Failed to save attendance record: ${error.message}`);
        }
    }

    saveToLocalStorage(record) {
        let records = this.getLocalStorageRecords();
        records.push(record);
        localStorage.setItem('qr_attendance_records', JSON.stringify(records));
    }

    getLocalStorageRecords() {
        try {
            const records = localStorage.getItem('qr_attendance_records');
            return records ? JSON.parse(records) : [];
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return [];
        }
    }

    populateScannedQRCodes(records) {
        // Populate the scanned QR codes set from existing records
        this.scannedQRCodes.clear();
        records.forEach(record => {
            if (record.raw_qr_data) {
                this.scannedQRCodes.add(record.raw_qr_data);
            }
        });
        console.log(`Loaded ${this.scannedQRCodes.size} previously scanned QR codes for duplicate prevention`);
    }

    generateId() {
        return 'record_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    clearScannedQRCodes() {
        const count = this.scannedQRCodes.size;
        this.scannedQRCodes.clear();
        this.updateStatus(`🔄 Cleared ${count} blocked QR codes - duplicates now allowed`);
        console.log('Duplicate prevention cleared - all QR codes can now be scanned again');
    }

    async clearAllAttendance() {
        try {
            // Get current records for clearing
            let records = [];
            
            if (!this.useLocalStorage) {
                try {
                    const response = await fetch('tables/attendance?limit=1000');
                    if (response.ok) {
                        const data = await response.json();
                        records = data.data || [];
                    } else {
                        throw new Error('API clear failed');
                    }
                } catch (error) {
                    console.log('API clear failed, using localStorage:', error.message);
                    this.useLocalStorage = true;
                }
            }
            
            if (this.useLocalStorage) {
                // Clear localStorage
                localStorage.removeItem('qr_attendance_records');
                console.log('Cleared all records from localStorage');
            } else {
                // Clear API records (delete each one)
                for (const record of records) {
                    try {
                        await fetch(`tables/attendance/${record.id}`, {
                            method: 'DELETE'
                        });
                    } catch (error) {
                        console.error('Error deleting record:', record.id, error);
                    }
                }
                console.log(`Cleared ${records.length} records from API`);
            }
            
            // Clear the scanned QR codes set
            this.scannedQRCodes.clear();
            
            // Refresh the display
            this.loadAttendanceRecords();
            
        } catch (error) {
            console.error('Error clearing all attendance:', error);
            this.updateStatus('❌ Error clearing attendance data');
        }
    }

    async loadAttendanceRecords() {
        let records = [];
        
        // Try API first if not in localStorage mode
        if (!this.useLocalStorage) {
            try {
                console.log('Loading attendance records from API...');
                const response = await fetch('tables/attendance?sort=scan_timestamp&limit=100');
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('Loaded attendance data from API:', data);
                    records = data.data || [];
                    this.populateScannedQRCodes(records);
                    this.displayAttendanceRecords(records);
                    this.recordCount.textContent = data.total || 0;
                    return;
                } else {
                    throw new Error(`API Error: HTTP ${response.status}`);
                }
            } catch (error) {
                console.log('API failed for loading, switching to localStorage:', error.message);
                this.useLocalStorage = true;
            }
        }

        // Use localStorage
        try {
            console.log('Loading attendance records from localStorage...');
            records = this.getLocalStorageRecords();
            console.log('Loaded attendance data from localStorage:', records);
            this.populateScannedQRCodes(records);
            this.displayAttendanceRecords(records);
            this.recordCount.textContent = records.length;
            
            if (this.useLocalStorage) {
                this.updateStatus('📱 Running in offline mode - data stored locally');
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            this.updateStatus(`❌ Error loading records: ${error.message}`);
        }
    }

    displayAttendanceRecords(records) {
        if (!records || records.length === 0) {
            this.attendanceTable.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-12 text-secondary">
                        <i class="fas fa-qrcode text-4xl mb-3 text-accent"></i>
                        <br><span class="text-lg font-medium">No attendance records yet</span>
                        <br><span class="text-sm text-gray-500 mt-1">Start scanning QR codes to see records here</span>
                    </td>
                </tr>
            `;
            return;
        }

        // Sort records by timestamp (newest first)
        records.sort((a, b) => new Date(b.scan_timestamp) - new Date(a.scan_timestamp));

        this.attendanceTable.innerHTML = records.map((record, index) => {
            const timestamp = new Date(record.scan_timestamp);
            const formattedTime = timestamp.toLocaleString();
            
            return `
                <tr class="border-b border-gray-200">
                    <td class="py-4 px-4 text-secondary font-medium">${index + 1}</td>
                    <td class="py-4 px-4 font-semibold text-dark">${this.escapeHtml(record.name)}</td>
                    <td class="py-4 px-4 text-secondary">${this.escapeHtml(record.country)}</td>
                    <td class="py-4 px-4 text-accent text-sm">${formattedTime}</td>
                    <td class="py-4 px-4">
                        <button onclick="scanner.deleteRecord('${record.id}')" 
                                class="text-red-500 hover:text-red-700 text-sm px-3 py-1 rounded-lg hover:bg-red-50 transition-all duration-200">
                            <i class="fas fa-trash mr-1"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async deleteRecord(recordId) {
        if (confirm('Are you sure you want to delete this attendance record?')) {
            try {
                // Try API first if not in localStorage mode
                if (!this.useLocalStorage) {
                    try {
                        const response = await fetch(`tables/attendance/${recordId}`, {
                            method: 'DELETE'
                        });

                        if (response.ok) {
                            // Note: We reload records which will repopulate the scanned QR codes set
                            // This effectively removes the deleted QR from the blocked list
                            this.loadAttendanceRecords();
                            this.updateStatus('✅ Record deleted successfully');
                            return;
                        } else {
                            throw new Error('API delete failed');
                        }
                    } catch (error) {
                        console.log('API delete failed, using localStorage:', error.message);
                        this.useLocalStorage = true;
                    }
                }

                // Use localStorage
                let records = this.getLocalStorageRecords();
                const recordToDelete = records.find(record => record.id === recordId);
                records = records.filter(record => record.id !== recordId);
                localStorage.setItem('qr_attendance_records', JSON.stringify(records));
                
                // Remove from scanned QR codes set to allow re-scanning
                if (recordToDelete && recordToDelete.raw_qr_data) {
                    this.scannedQRCodes.delete(recordToDelete.raw_qr_data);
                }
                
                this.loadAttendanceRecords();
                this.updateStatus('✅ Record deleted successfully (offline mode)');
                
            } catch (error) {
                console.error('Error deleting record:', error);
                this.updateStatus('❌ Error deleting record');
            }
        }
    }

    displayScanResult(parsedData, rawData) {
        const timestamp = new Date().toLocaleString();
        
        this.scanResult.innerHTML = `
            <div class="text-left">
                <div class="flex items-center mb-3">
                    <i class="fas fa-check-circle text-primary text-xl mr-2"></i>
                    <span class="font-semibold text-dark">QR Code Scanned Successfully!</span>
                </div>
                <div class="space-y-2 text-sm">
                    <div><span class="font-medium text-secondary">Name:</span> 
                         <span class="text-gray-800">${this.escapeHtml(parsedData.name)}</span></div>
                    <div><span class="font-medium text-secondary">Country:</span> 
                         <span class="text-gray-800">${this.escapeHtml(parsedData.country)}</span></div>
                    <div><span class="font-medium text-secondary">Scanned at:</span> 
                         <span class="text-gray-800">${timestamp}</span></div>
                </div>
            </div>
        `;
    }

    displayError(title, message = '') {
        const fullMessage = message ? `${title}: ${message}` : title;
        this.scanResult.innerHTML = `
            <div class="text-center">
                <i class="fas fa-exclamation-triangle text-red-500 text-3xl mb-2"></i>
                <p class="text-red-600 font-semibold mb-1">${this.escapeHtml(title)}</p>
                ${message ? `<p class="text-red-500 text-sm">${this.escapeHtml(message)}</p>` : ''}
            </div>
        `;
    }

    async exportToCSV() {
        try {
            let records = [];

            // Try API first if not in localStorage mode
            if (!this.useLocalStorage) {
                try {
                    const response = await fetch('tables/attendance?limit=1000&sort=scan_timestamp');
                    if (response.ok) {
                        const data = await response.json();
                        records = data.data || [];
                    } else {
                        throw new Error('API export failed');
                    }
                } catch (error) {
                    console.log('API export failed, using localStorage:', error.message);
                    this.useLocalStorage = true;
                }
            }

            // Use localStorage if API failed or in localStorage mode
            if (this.useLocalStorage) {
                records = this.getLocalStorageRecords();
            }

            if (records.length === 0) {
                alert('No attendance records to export.');
                return;
            }

            // Sort records by timestamp (newest first)
            records.sort((a, b) => new Date(b.scan_timestamp) - new Date(a.scan_timestamp));

            // Create CSV content
            const headers = ['No.', 'Name', 'Country', 'Scan Date', 'Scan Time', 'Full Timestamp'];
            const csvRows = [headers.join(',')];

            records.forEach((record, index) => {
                const timestamp = new Date(record.scan_timestamp);
                const date = timestamp.toLocaleDateString();
                const time = timestamp.toLocaleTimeString();
                const fullTimestamp = timestamp.toLocaleString();
                
                const row = [
                    index + 1,
                    `"${record.name.replace(/"/g, '""')}"`, // Escape quotes in CSV
                    `"${record.country.replace(/"/g, '""')}"`,
                    `"${date}"`,
                    `"${time}"`,
                    `"${fullTimestamp}"`
                ];
                csvRows.push(row.join(','));
            });

            // Create and download file
            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `attendance-records-${timestamp}.csv`;
            
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.updateStatus(`✅ CSV exported: ${filename}`);
            
        } catch (error) {
            console.error('Error exporting CSV:', error);
            this.updateStatus('❌ Error exporting CSV file');
            alert('Error exporting CSV file. Please try again.');
        }
    }

    updateStatus(message) {
        this.status.textContent = message;
        console.log('Status:', message);
    }

    async testAPI() {
        this.updateStatus('🧪 Testing API connection...');
        console.log('Testing API connection...');
        
        try {
            const getResponse = await fetch('tables/attendance');
            console.log('GET test - Status:', getResponse.status);
            
            if (getResponse.ok) {
                const getData = await getResponse.json();
                console.log('GET test - Data:', getData);
                this.updateStatus(`✅ API working. Found ${getData.total || 0} records.`);
                this.useLocalStorage = false;
                const storageMode = document.getElementById('storageMode');
                storageMode.textContent = '🌐 Online Mode - Data synced to server';
                storageMode.className = 'text-xs text-primary text-center mt-2 font-medium';
            } else {
                throw new Error(`HTTP ${getResponse.status}`);
            }
        } catch (error) {
            console.error('API test error:', error);
            this.updateStatus(`❌ API failed. Switching to offline mode.`);
            this.useLocalStorage = true;
            const storageMode = document.getElementById('storageMode');
            storageMode.textContent = '📱 Offline Mode - Data stored locally in browser';
            storageMode.className = 'text-xs text-secondary text-center mt-2 font-medium';
            
            // Load local data
            this.loadAttendanceRecords();
        }
    }

    async addTestRecord() {
        this.updateStatus('➕ Adding test record...');
        console.log('Adding test record manually...');
        
        const timestamp = Date.now();
        const testLastName = 'TESTLAST';
        const testFirstName = 'TestFirst';
        const testCountry = 'Test Country';
        const testQR = `${testLastName}, ${testFirstName}, ${testCountry}`;
        
        // Process the test QR as if it was scanned
        this.processQRData(testQR);
    }

    // Enhanced diagnostic function to check scanner status
    diagnoseScanner() {
        console.log('=== ENHANCED SCANNER DIAGNOSTICS ===');
        console.log('Video element:', this.video);
        console.log('Video ready state:', this.video.readyState);
        console.log('Video dimensions:', this.video.videoWidth, 'x', this.video.videoHeight);
        console.log('Canvas dimensions:', this.canvas.width, 'x', this.canvas.height);
        console.log('Scanning active:', this.scanning);
        console.log('Stream active:', !!this.stream);
        console.log('Scan attempts:', this.scanAttempts);
        console.log('Last scanned code:', this.lastScannedCode);
        console.log('Cooldown remaining:', Math.max(0, this.scanCooldown - (Date.now() - this.lastScanTime)));
        console.log('Scanned QR codes (blocked):', this.scannedQRCodes.size);
        console.log('Blocked QR list:', Array.from(this.scannedQRCodes));
        
        // Test canvas drawing
        if (this.video.readyState >= 2) {
            try {
                this.ctx.drawImage(this.video, 0, 0, 100, 100);
                console.log('✅ Canvas drawing test successful');
            } catch (error) {
                console.log('❌ Canvas drawing test failed:', error);
            }
        }
        
        // Check camera capabilities
        if (this.stream) {
            const track = this.stream.getVideoTracks()[0];
            if (track) {
                const settings = track.getSettings();
                console.log('Camera settings:', settings);
            }
        }
        
        this.updateStatus('🔍 Diagnostics complete - check browser console for details');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the scanner when the page loads
let scanner;
document.addEventListener('DOMContentLoaded', () => {
    scanner = new QRAttendanceScanner();
    
    // Auto-test API on load after a delay
    setTimeout(() => {
        scanner.testAPI();
    }, 2000);
});