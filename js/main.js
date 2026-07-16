/**
 * Main JavaScript file for Batt's Booking Buddy (bbb)
 * 
 * This file handles the core functionality for the booking system including:
 * 
 * 1. Mobile Navigation
 *    - Toggle mobile menu open/close
 *    - Handle smooth scrolling for anchor links
 *    - Highlight active navigation sections on scroll
 * 
 * 2. Booking Selection
 *    - Populate month dropdowns with current month + next 2 months
 *    - Handle month selection and disable other options
 *    - Enable/disable next button based on selection
 * 
 * 3. Calendar Functionality
 *    - Custom calendar for single session bookings
 *    - Display available days (Monday, Wednesday, Friday)
 *    - Handle date selection and save booking data
 *    - Prevent selection of past dates
 * 
 * 4. Form Handling
 *    - Booking form submission
 *    - Contact form submission
 *    - User details form validation
 *    - Date picker minimum date validation
 * 
 * 5. Data Management
 *    - Save booking data to localStorage (monthly and single sessions)
 *    - Save user details to localStorage
 *    - Display booking summary with secure pricing
 *    - Handle discount codes
 * 
 * 6. UI Enhancements
 *    - Header scroll effects
 *    - Active navigation highlighting
 *    - Mobile menu accessibility (ARIA attributes)
 */

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Toggle mobile menu
    if (menuToggle && nav) {
        menuToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            nav.classList.toggle('active');
            
            // Update ARIA attributes
            const expanded = this.classList.contains('active');
            this.setAttribute('aria-expanded', expanded);
            
            // Prevent body scrolling when menu is open
            document.body.style.overflow = expanded ? 'hidden' : '';
        });
        
        // Close menu when clicking on a link
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (nav.classList.contains('active')) {
                    menuToggle.classList.remove('active');
                    nav.classList.remove('active');
                    menuToggle.setAttribute('aria-expanded', 'false');
                    document.body.style.overflow = '';
                }
            });
        });
    }
    
    // Populate month dropdowns with current month + next 2 months
    const monthSelects = document.querySelectorAll('.month-select');
    if (monthSelects.length > 0) {
        populateMonthOptions(monthSelects);
        
        // Add event listeners to month selects
        monthSelects.forEach(select => {
            select.addEventListener('change', function() {
                const selectedMonth = this.value;
                const price = this.getAttribute('data-price');
                const plan = this.getAttribute('data-plan');
                
                if (selectedMonth) {
                    // Disable other dropdowns
                    monthSelects.forEach(otherSelect => {
                        if (otherSelect !== this) {
                            otherSelect.disabled = true;
                            otherSelect.parentElement.classList.add('disabled');
                        }
                    });
                    
                    // Disable show calendar button if exists
                    const calendarBtn = document.getElementById('show-calendar-btn');
                    if (calendarBtn) {
                        calendarBtn.disabled = true;
                        calendarBtn.classList.add('disabled');
                    }
                    
                    // Save booking data to localStorage
                    saveBookingData(selectedMonth, price, plan);
                    
                    // Enable the next button
                    const nextButton = document.getElementById('next-button');
                    if (nextButton) {
                        nextButton.classList.add('active');
                        nextButton.classList.remove('disabled');
                        nextButton.setAttribute('aria-disabled', 'false');
                    }
                } else {
                    // If no option is selected, enable all dropdowns
                    monthSelects.forEach(otherSelect => {
                        otherSelect.disabled = false;
                        otherSelect.parentElement.classList.remove('disabled');
                    });
                    
                    // Enable show calendar button if exists
                    const calendarBtn = document.getElementById('show-calendar-btn');
                    if (calendarBtn) {
                        calendarBtn.disabled = false;
                        calendarBtn.classList.remove('disabled');
                    }
                    // Disable the next button
                    const nextButton = document.getElementById('next-button');
                    if (nextButton) {
                        nextButton.classList.remove('active');
                        nextButton.classList.add('disabled');
                        nextButton.setAttribute('aria-disabled', 'true');
                    }
                }
            });
        });
    }
    
    // Prevent navigation on Next button unless enabled
    const nextButton = document.getElementById('next-button');
    if (nextButton) {
        nextButton.addEventListener('click', function(e) {
            if (nextButton.classList.contains('disabled') || nextButton.getAttribute('aria-disabled') === 'true') {
                e.preventDefault();
            }
        });
    }

    // Handle Show Calendar button
    const showCalendarBtn = document.getElementById('show-calendar-btn');
    if (showCalendarBtn) {
        const calendarWrapper = document.getElementById('calendar-wrapper');
        const customCalendar = document.querySelector('.custom-calendar');
        
        if (customCalendar) {
            // Initialize calendar when button is clicked
            showCalendarBtn.addEventListener('click', function() {
                if (calendarWrapper) {
                    calendarWrapper.classList.toggle('hidden');
                    
                    // If showing calendar, disable month dropdowns and initialize calendar
                    if (!calendarWrapper.classList.contains('hidden')) {
                        const monthSelects = document.querySelectorAll('.month-select');
                        monthSelects.forEach(select => {
                            select.disabled = true;
                            select.parentElement.classList.add('disabled');
                        });
                        
                        // Initialize calendar if not already initialized
                        initCalendar(customCalendar, showCalendarBtn.getAttribute('data-price'), showCalendarBtn.getAttribute('data-plan'));
                    }
                }
            });
        }
    }
    
    // Function to initialize the custom calendar
    function initCalendar(calendarElement, price, plan) {
        const currentMonthElement = calendarElement.querySelector('.current-month');
        const daysContainer = calendarElement.querySelector('.days');
        const prevMonthBtn = calendarElement.querySelector('.prev-month');
        const nextMonthBtn = calendarElement.querySelector('.next-month');
        const selectedDateDisplay = calendarElement.querySelector('.selected-date-display');
        
        // Get current date
        let currentDate = new Date();
        let currentMonth = currentDate.getMonth();
        let currentYear = currentDate.getFullYear();
        
        // Initialize calendar
        renderCalendar();
        
        // Event listeners for month navigation
        prevMonthBtn.addEventListener('click', function() {
            // Don't allow going to past months
            const today = new Date();
            const prevMonth = new Date(currentYear, currentMonth - 1, 1);
            
            if (prevMonth.getMonth() >= today.getMonth() || prevMonth.getFullYear() > today.getFullYear()) {
                currentMonth--;
                if (currentMonth < 0) {
                    currentMonth = 11;
                    currentYear--;
                }
                renderCalendar();
            }
        });
        
        nextMonthBtn.addEventListener('click', function() {
            // Only allow navigating to the next month
            const maxDate = new Date();
            maxDate.setMonth(maxDate.getMonth() + 1);
            
            const nextMonth = new Date(currentYear, currentMonth + 1, 1);
            if (nextMonth <= maxDate) {
                currentMonth++;
                if (currentMonth > 11) {
                    currentMonth = 0;
                    currentYear++;
                }
                renderCalendar();
            }
        });
        
        // Function to render the calendar
        function renderCalendar() {
            // Update current month display
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            currentMonthElement.textContent = `${months[currentMonth]} ${currentYear}`;
            
            // Clear previous days
            daysContainer.innerHTML = '';
            
            // Get first day of month and total days in month
            const firstDay = new Date(currentYear, currentMonth, 1).getDay();
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            
            // Add empty cells for days before first day of month
            for (let i = 0; i < firstDay; i++) {
                const emptyDay = document.createElement('div');
                daysContainer.appendChild(emptyDay);
            }
            
            // Add days of the month
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            for (let day = 1; day <= daysInMonth; day++) {
                const dayElement = document.createElement('div');
                dayElement.textContent = day;
                
                // Create date object for this day
                const date = new Date(currentYear, currentMonth, day);
                
                // Check if date is in the past
                if (date < today) {
                    dayElement.classList.add('disabled');
                } else {
                    // Check if day is Monday (1), Wednesday (3), or Friday (5)
                    const dayOfWeek = date.getDay();
                    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
                        dayElement.classList.add('available');
                        
                        // Add click event to selectable days
                        dayElement.addEventListener('click', function() {
                            // Remove selected class from all days
                            document.querySelectorAll('.days div').forEach(day => {
                                day.classList.remove('selected');
                            });
                            
                            // Add selected class to clicked day
                            this.classList.add('selected');
                            
                            // Format date for display
                            const selectedDate = new Date(currentYear, currentMonth, day);
                            const formattedDate = selectedDate.toLocaleDateString('en-GB', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            });
                            
                            // Update selected date display
                            selectedDateDisplay.textContent = `Selected: ${formattedDate}`;
                            
                            // Save session data - pass the date components directly instead of ISO string
                            // This prevents timezone issues where the date might shift
                            saveSessionData({
                                year: currentYear,
                                month: currentMonth,
                                day: day
                            }, price, plan);
                            
                            // Enable the next button
                            const nextButton = document.getElementById('next-button');
                            if (nextButton) {
                                nextButton.classList.add('active');
                                nextButton.classList.remove('disabled');
                                nextButton.setAttribute('aria-disabled', 'false');
                            }
                        });
                    } else {
                        dayElement.classList.add('disabled');
                    }
                }
                
                daysContainer.appendChild(dayElement);
            }
        }
    }
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
                
                // Close mobile menu if open
                if (nav && nav.classList.contains('active')) {
                    nav.classList.remove('active');
                    mobileMenuToggle.classList.remove('active');
                }
            }
        });
    });
    
    // Form submission
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(this);
            const formObject = {};
            
            formData.forEach((value, key) => {
                formObject[key] = value;
            });
            
            // Here you would typically send the form data to a server
            console.log('Form submitted:', formObject);
            
            // Show success message
            alert('Thank you for your booking request! We will contact you shortly to confirm your lesson.');
            
            // Reset form
            this.reset();
        });
    }
    
    // Contact form submission
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(this);
            const formObject = {};
            
            formData.forEach((value, key) => {
                formObject[key] = value;
            });
            
            // Get the target email address from the hidden field
            const targetEmail = formObject.contact_email || 'info@battsharlow.com';
            
            // Log form data (in a real scenario, you would send this to a server)
            console.log('Contact form submitted:', formObject);
            
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'form-success';
            successMessage.innerHTML = `<p>Thank you for your message! We will contact you shortly.</p><p>Your message has been prepared for: ${targetEmail}</p>`;
            
            // Replace form with success message
            contactForm.style.display = 'none';
            contactForm.parentNode.appendChild(successMessage);
            
            // In a real implementation, you would send this data to a server
            // For now, we're just showing a success message
        });
    }
    
    // Set minimum date to today for the date picker
    const dateInput = document.querySelector('input[type="date"]');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
    }
    
    // Handle details form
    const detailsForm = document.getElementById('details-form');
    if (detailsForm) {
        // Display booking summary if available
        displayBookingSummary();
        
        detailsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const yourName = document.getElementById('your-name').value.trim();
            const playerName = document.getElementById('player-name').value.trim();
            const yourNameError = document.getElementById('your-name-error');
            const playerNameError = document.getElementById('player-name-error');
            
            // Reset error messages if they exist
            if (yourNameError) yourNameError.style.display = 'none';
            if (playerNameError) playerNameError.style.display = 'none';
            
            // Validate inputs
            let isValid = true;
            
            if (!yourName) {
                isValid = false;
                if (yourNameError) yourNameError.style.display = 'block';
            }
            
            if (!playerName) {
                isValid = false;
                if (playerNameError) playerNameError.style.display = 'block';
            }
            
            // Only proceed if validation passes
            if (isValid) {
                // Save user details to localStorage
                saveUserDetails(yourName, playerName);
                
                // Redirect to the booking summary page
                window.location.href = 'booking-summary.html';
            }
        });
    }
});

// Function to populate month options
function populateMonthOptions(selectElements) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Create options for current month and next 2 months
    selectElements.forEach(select => {
        // Clear existing options except the first one
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // Add options for current month and next 2 months
        for (let i = 0; i < 3; i++) {
            const monthIndex = (currentMonth + i) % 12;
            const year = currentYear + Math.floor((currentMonth + i) / 12);
            const option = document.createElement('option');
            option.value = `${months[monthIndex]} ${year}`;
            option.textContent = `${months[monthIndex]} ${year}`;
            select.appendChild(option);
        }
    });
}

// Function to save booking data to localStorage
function saveBookingData(month, price, plan) {
    // For monthly bookings, we want to keep the month and year format (e.g., 'June 2025')
    // We don't need to convert it to a short date format
    
    // SECURITY UPDATE: We no longer store the actual price in localStorage
    // to prevent client-side manipulation. We'll use the server to determine price.
    // We still keep the old price field for backward compatibility
    const bookingData = {
        month: month,
        // For monthly bookings, we'll use the month name directly instead of a short date
        // This ensures the Google Sheet shows 'June 2025' instead of '01/06/25'
        shortDate: '', // Leave this empty for monthly bookings to use the month name
        price: price, // Kept for backward compatibility only, will be verified server-side
        plan: plan,
        skillLevel: getSkillLevelFromPage(),
        bookingType: 'monthly'
    };
    
    localStorage.setItem('bookingData', JSON.stringify(bookingData));
}

// Function to save session data to localStorage
function saveSessionData(dateComponents, price, plan) {
    // Create Date object from components - this avoids timezone issues
    // Note: JavaScript months are 0-indexed (0 = January, 11 = December)
    const selectedDate = new Date(
        dateComponents.year, 
        dateComponents.month, 
        dateComponents.day, 
        12, 0, 0 // Set to noon to avoid any timezone day-shifting issues
    );
    
    // Get day of week name (e.g., 'Monday')
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = weekdays[selectedDate.getDay()];
    
    // Get month name (e.g., 'June')
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = months[selectedDate.getMonth()];
    
    // Format date for display (long format)
    const formattedDate = `${dayOfWeek} ${selectedDate.getDate()} ${monthName} ${selectedDate.getFullYear()}`;
    
    // Format date for Google Sheet (short UK format DD/MM/YY)
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0'); // +1 because months are 0-indexed
    const year = String(selectedDate.getFullYear()).slice(-2); // Get last 2 digits of year
    const shortDate = `${day}/${month}/${year}`;
    
    // Store the raw date components for reference (useful for debugging)
    const rawDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    
    const bookingData = {
        date: formattedDate,
        shortDate: shortDate,
        rawDate: rawDateStr, // Store raw date for reference
        price: price,
        plan: plan,
        skillLevel: getSkillLevelFromPage(),
        bookingType: 'single'
    };
    
    localStorage.setItem('bookingData', JSON.stringify(bookingData));
    return true;
}

// Function to save user details to localStorage
function saveUserDetails(yourName, playerName) {
    const userDetails = {
        yourName: yourName,
        playerName: playerName
    };
    
    localStorage.setItem('userDetails', JSON.stringify(userDetails));
}

// Function to display booking summary
async function displayBookingSummary() {
    // Get elements
    const bookingDetailsElement = document.getElementById('booking-details');
    const yourNameElement = document.getElementById('your-name-display');
    const playerNameElement = document.getElementById('player-name-display');
    const originalPriceElement = document.getElementById('original-price-value');
    const totalPriceElement = document.getElementById('total-price-value');
    const discountAmountElement = document.getElementById('discount-amount');
    const discountAmountValue = document.getElementById('discount-amount-value');
    const discountCodeInput = document.getElementById('discount-code');
    
    // Return if we're not on the booking summary page
    if (!bookingDetailsElement) return;
    
    // Get data from localStorage
    const bookingData = JSON.parse(localStorage.getItem('bookingData'));
    const userDetails = JSON.parse(localStorage.getItem('userDetails'));
    const discountCode = localStorage.getItem('discountCode');
    
    // Display booking details
    if (bookingData) {
        let bookingType = '';
        
        // Display different information based on booking type
        if (bookingData.bookingType === 'monthly') {
            bookingType = `Monthly booking (${bookingData.plan}) for ${bookingData.month}`;
        } else if (bookingData.bookingType === 'single') {
            bookingType = `Single session (${bookingData.plan}) on ${bookingData.date}`;
        }
        
        // Update booking details section
        const groupSelectedElement = document.getElementById('group-selected-display');
        if (groupSelectedElement && bookingData.skillLevel) {
            groupSelectedElement.textContent = `Group Selected: ${bookingData.skillLevel}`;
        }
        
        document.getElementById('booking-type').textContent = `Booking Type: ${bookingType}`;
        
        try {
            // Get secure pricing from server instead of using localStorage
            // This prevents client-side price manipulation
            if (typeof window.getSecurePricing === 'function') {
                console.log('Requesting secure pricing with:', {
                    skillLevel: bookingData.skillLevel,
                    plan: bookingData.plan,
                    discountCode: discountCode || ''
                });
                
                const priceInfo = await window.getSecurePricing(
                    bookingData.skillLevel,
                    bookingData.plan,
                    discountCode || ''
                );
                
                console.log('Received price info:', priceInfo);
                
                // Update UI with server-verified prices
                if (originalPriceElement) {
                    originalPriceElement.textContent = priceInfo.originalPrice;
                }
                
                if (totalPriceElement) {
                    totalPriceElement.textContent = priceInfo.finalPrice;
                }
                
                // Display discount if applied
                if (parseFloat(priceInfo.discountAmount) > 0) {
                    if (discountAmountElement) discountAmountElement.style.display = 'block';
                    if (discountAmountValue) discountAmountValue.textContent = priceInfo.discountAmount;
                    if (discountCodeInput) discountCodeInput.value = discountCode || '';
                } else {
                    // Hide discount section if no discount is applied
                    if (discountAmountElement) discountAmountElement.style.display = 'none';
                }
            } else {
                // Fallback to legacy code if secure API is not available
                console.warn('Secure pricing API not available, using fallback pricing');
                fallbackDisplayPricing();
            }
        } catch (error) {
            console.error('Error getting secure pricing:', error);
            // Fallback to legacy price display if API fails
            fallbackDisplayPricing();
        }
        
        // Legacy fallback function for backward compatibility
        function fallbackDisplayPricing() {
            // Set original price - ensure it's a valid number
            if (originalPriceElement) {
                const price = parseFloat(bookingData.price);
                originalPriceElement.textContent = price.toFixed(2);
                
                // If no discount has been applied yet, set the total price to the original price
                if (!localStorage.getItem('totalPrice') && totalPriceElement) {
                    totalPriceElement.textContent = price.toFixed(2);
                }
            }
            
            // Set total price if it exists in localStorage
            const storedTotalPrice = localStorage.getItem('totalPrice');
            if (storedTotalPrice && totalPriceElement) {
                totalPriceElement.textContent = parseFloat(storedTotalPrice).toFixed(2);
            }
            
            // Display discount if applied
            const storedDiscountAmount = localStorage.getItem('discountAmount');
            if (discountCode && discountCode === 'SIB' && discountAmountElement && discountAmountValue) {
                discountAmountElement.style.display = 'block';
                discountAmountValue.textContent = parseFloat(storedDiscountAmount).toFixed(2);
                if (discountCodeInput) {
                    discountCodeInput.value = discountCode;
                }
            } else {
                // Hide discount section if no discount is applied
                if (discountAmountElement) {
                    discountAmountElement.style.display = 'none';
                }
            }
        }
    } else {
        // No booking data found
        bookingDetailsElement.innerHTML = '<p>No booking information found. Please go back and select a booking option.</p>';
        
        // Clear any discount or price data that might be lingering
        if (originalPriceElement) originalPriceElement.textContent = '0.00';
        if (totalPriceElement) totalPriceElement.textContent = '0.00';
        if (discountAmountElement) discountAmountElement.style.display = 'none';
    }
    
    // Display user details
    if (userDetails) {
        if (yourNameElement) {
            yourNameElement.textContent = `Card Holders Name: ${userDetails.yourName}`;
        }
        if (playerNameElement) {
            playerNameElement.textContent = `Player's Name: ${userDetails.playerName}`;
        }
    } else {
        if (yourNameElement) {
            yourNameElement.textContent = 'Card Holders Name: Not provided';
        }
        if (playerNameElement) {
            playerNameElement.textContent = "Player's Name: Not provided";
        }
    }
}

// Function to get skill level from current page
function getSkillLevelFromPage() {
    const path = window.location.pathname;
    if (path.includes('beginner')) {
        return '1-Under 11';
    } else if (path.includes('intermediate')) {
        return '2-Open';
    } else if (path.includes('advanced')) {
        return '3-Squad';
    } else {
        return 'Unknown';
    }
}

// Add active class to nav links on scroll
window.addEventListener('scroll', function() {
    const scrollPosition = window.scrollY;
    const header = document.querySelector('.header');
    
    if (scrollPosition > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
    
    // Highlight active section in navigation
    document.querySelectorAll('section').forEach(section => {
        const sectionTop = section.offsetTop - 100;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            document.querySelectorAll('.main-nav a').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
});
