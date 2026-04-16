class AttendanceCalculator {
    constructor() {
        this.subjects = this.loadFromStorage();
        this.expandedSubjects = new Set(); // Track which subjects are expanded
        this.init();
    }

    init() {
        this.bindEvents();
        this.render();
        this.updateOverallStats();
    }

    bindEvents() {
        document.getElementById('addSubjectBtn').addEventListener('click', () => {
            this.addSubject();
        });
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', (event) => {
            this.importData(event);
        });
    }

    loadFromStorage() {
        try {
            const data = localStorage.getItem('attendanceData');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading data from localStorage:', error);
            return [];
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('attendanceData', JSON.stringify(this.subjects));
        } catch (error) {
            console.error('Error saving data to localStorage:', error);
        }
    }
    
    exportData() {
        const dataStr = JSON.stringify(this.subjects, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                this.subjects = importedData;
                this.saveToStorage();
                this.render();
                this.updateOverallStats();
                alert('✅ Data imported successfully!');
            } else {
                alert('❌ Invalid file format.');
            }
        } catch (error) {
            alert('❌ Error reading file. Make sure it is a valid JSON file.');
            console.error(error);
        }
    };
    reader.readAsText(file);
    }

    addSubject() {
        const newSubject = {
            id: Date.now(),
            name: 'New Subject',
            total: 0,
            attended: 0
        };
        
        this.subjects.push(newSubject);
        this.expandedSubjects.add(newSubject.id); // Auto-expand new subjects
        this.saveToStorage();
        this.render();
        this.updateOverallStats();
    }

    removeSubject(id) {
        this.subjects = this.subjects.filter(subject => subject.id !== id);
        this.expandedSubjects.delete(id);
        this.saveToStorage();
        this.render();
        this.updateOverallStats();
    }

    toggleSubject(id) {
        if (this.expandedSubjects.has(id)) {
            this.expandedSubjects.delete(id);
        } else {
            this.expandedSubjects.add(id);
        }
        this.render();
    }

    updateSubject(id, field, value) {
        const subject = this.subjects.find(s => s.id === id);
        if (subject) {
            if (field === 'name') {
                subject[field] = value;
            } else {
                const numValue = parseInt(value) || 0;
                subject[field] = Math.max(0, numValue);
                
                // Ensure attended doesn't exceed total
                if (field === 'total' && subject.attended > numValue) {
                    subject.attended = numValue;
                }
                if (field === 'attended' && numValue > subject.total) {
                    subject.total = numValue;
                }
            }
            this.saveToStorage();
            this.render();
            this.updateOverallStats();
        }
    }

    incrementValue(id, field) {
        const subject = this.subjects.find(s => s.id === id);
        if (subject) {
            subject[field]++;
            // Ensure attended doesn't exceed total when incrementing attended
            if (field === 'attended' && subject.attended > subject.total) {
                subject.total = subject.attended;
            }
            this.saveToStorage();
            this.render();
            this.updateOverallStats();
        }
    }

    decrementValue(id, field) {
        const subject = this.subjects.find(s => s.id === id);
        if (subject) {
            subject[field] = Math.max(0, subject[field] - 1);
            // Ensure attended doesn't exceed total when decrementing total
            if (field === 'total' && subject.attended > subject.total) {
                subject.attended = subject.total;
            }
            this.saveToStorage();
            this.render();
            this.updateOverallStats();
        }
    }

    // New method to increment both attended and total
    incrementBoth(id) {
        const subject = this.subjects.find(s => s.id === id);
        if (subject) {
            subject.attended++;
            subject.total++;
            this.saveToStorage();
            this.render();
            this.updateOverallStats();
        }
    }

    // New method to decrement both attended and total
    decrementBoth(id) {
        const subject = this.subjects.find(s => s.id === id);
        if (subject) {
            if (subject.attended > 0 && subject.total > 0) {
                subject.attended--;
                subject.total--;
            }
            this.saveToStorage();
            this.render();
            this.updateOverallStats();
        }
    }

    calculateAttendance(attended, total) {
        if (total === 0) return 0;
        return (attended / total) * 100;
    }

    calculateLeaves(attended, total) {
        if (total === 0) return 0;
        
        // Find maximum classes that can be missed while staying >= 75%
        let leaves = 0;
        while (true) {
            const newPercentage = (attended / (total + leaves + 1)) * 100;
            if (newPercentage >= 75) {
                leaves++;
            } else {
                break;
            }
        }
        return leaves;
    }

    calculateRequired(attended, total) {
        if (total === 0) return 1;
        
        // Find minimum additional classes to attend to reach >= 75%
        let required = 0;
        while (true) {
            const newPercentage = ((attended + required) / (total + required)) * 100;
            if (newPercentage >= 75) {
                break;
            }
            required++;
        }
        return required;
    }

    getStatusInfo(attended, total) {
        const percentage = this.calculateAttendance(attended, total);
        
        if (percentage >= 75) {
            const leaves = this.calculateLeaves(attended, total);
            return {
                percentage: percentage.toFixed(1),
                status: 'safe',
                message: `✅ Safe — Leaves left: ${leaves}`
            };
        } else {
            const required = this.calculateRequired(attended, total);
            return {
                percentage: percentage.toFixed(1),
                status: 'short',
                message: `❌ Short — Classes needed: ${required}`
            };
        }
    }

    updateOverallStats() {
        const totalAttended = this.subjects.reduce((sum, s) => sum + s.attended, 0);
        const totalClasses = this.subjects.reduce((sum, s) => sum + s.total, 0);
        
        const percentageEl = document.getElementById('overallPercentage');
        const statusEl = document.getElementById('overallStatus');
        const alertEl = document.getElementById('alertMessage');
        
        if (this.subjects.length === 0) {
            percentageEl.textContent = '0%';
            statusEl.textContent = 'No subjects added';
            statusEl.className = 'status';
            alertEl.textContent = '';
            alertEl.className = 'alert';
            return;
        }
        
        const info = this.getStatusInfo(totalAttended, totalClasses);
        percentageEl.textContent = `${info.percentage}%`;
        statusEl.textContent = info.message;
        statusEl.className = `status ${info.status}`;
        
        // Check how many subjects are below 75%
        const subjectsBelow75 = this.subjects.filter(subject => {
            const percentage = this.calculateAttendance(subject.attended, subject.total);
            return percentage < 75;
        });
        
        // Update alert message
        if (subjectsBelow75.length === 0) {
            alertEl.textContent = '🎉 All subjects are above 75%!';
            alertEl.className = 'alert success';
        } else if (subjectsBelow75.length === 1) {
            alertEl.textContent = `⚠️ 1 subject is below 75%: ${subjectsBelow75[0].name}`;
            alertEl.className = 'alert warning';
        } else {
            const subjectNames = subjectsBelow75.map(s => s.name).join(', ');
            alertEl.textContent = `🚨 ${subjectsBelow75.length} subjects are below 75%: ${subjectNames}`;
            alertEl.className = 'alert danger';
        }
    }

    render() {
        const container = document.getElementById('subjectsContainer');
        container.innerHTML = '';
        
        this.subjects.forEach(subject => {
            const info = this.getStatusInfo(subject.attended, subject.total);
            const isExpanded = this.expandedSubjects.has(subject.id);
            
            const subjectEl = document.createElement('div');
            subjectEl.className = 'subject-card';
            subjectEl.innerHTML = `
                <div class="subject-header ${isExpanded ? 'expanded' : ''}" onclick="calculator.toggleSubject(${subject.id})">
                    <div class="subject-title">
                        <span class="subject-name-display">${subject.name}</span>
                        <span class="subject-percentage ${info.status}">${info.percentage}%</span>
                    </div>
                    <span class="expand-icon ${isExpanded ? 'expanded' : ''}">▼</span>
                </div>
                
                <div class="subject-content ${isExpanded ? 'expanded' : ''}">
                    <div class="subject-details">
                        <input type="text" class="subject-name-edit" value="${subject.name}" 
                               onchange="calculator.updateSubject(${subject.id}, 'name', this.value)"
                               onclick="event.stopPropagation()">
                        
                        <div class="subject-result ${info.status}">
                            <div class="result-percentage">${info.percentage}%</div>
                            <div class="result-status">${info.message}</div>
                        </div>
                        
                        <div class="subject-stats">
                            <div class="stat-group">
                                <div class="stat-label">Total Classes</div>
                                <div class="stat-controls">
                                    <button class="btn btn-secondary btn-small" 
                                            onclick="calculator.decrementValue(${subject.id}, 'total')">-1</button>
                                    <input type="number" class="stat-input" value="${subject.total}" min="0"
                                           onchange="calculator.updateSubject(${subject.id}, 'total', this.value)"
                                           onclick="event.stopPropagation()">
                                    <button class="btn btn-secondary btn-small" 
                                            onclick="calculator.incrementValue(${subject.id}, 'total')">+1</button>
                                </div>
                            </div>
                            
                            <div class="stat-group">
                                <div class="stat-label">Attended Classes</div>
                                <div class="stat-controls">
                                    <button class="btn btn-secondary btn-small" 
                                            onclick="calculator.decrementValue(${subject.id}, 'attended')">-1</button>
                                    <input type="number" class="stat-input" value="${subject.attended}" min="0"
                                           onchange="calculator.updateSubject(${subject.id}, 'attended', this.value)"
                                           onclick="event.stopPropagation()">
                                    <button class="btn btn-secondary btn-small" 
                                            onclick="calculator.incrementValue(${subject.id}, 'attended')">+1</button>
                                </div>
                            </div>
                            
                            <div class="stat-group both-controls">
                                <div class="stat-label">Attend Class</div>
                                <div class="stat-controls">
                                    <button class="btn btn-both btn-small" 
                                            onclick="calculator.decrementBoth(${subject.id})">-1</button>
                                    <span style="font-size: 0.8rem; color: #666;">Both</span>
                                    <button class="btn btn-both btn-small" 
                                            onclick="calculator.incrementBoth(${subject.id})">+1</button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="delete-section">
                            <button class="btn btn-danger btn-small delete-btn" 
                                    onclick="calculator.removeSubject(${subject.id})">Delete Subject</button>
                        </div>
                    </div>
                </div>
            `;
            
            container.appendChild(subjectEl);
        });
    }
}

// Initialize the calculator when the page loads
let calculator;
document.addEventListener('DOMContentLoaded', () => {
    calculator = new AttendanceCalculator();
});