# Digital Photo Frame - Frontend Technical Specification

## 1. Architecture & Technology Stack

* **1.1 Architectural Style:** Vanilla JavaScript with modular component pattern
* **1.2 Frameworks & Libraries:**
    * **UI Framework:** Vanilla HTML5, CSS3, JavaScript ES6+
    * **CSS Framework/Methodology:** Material Design 3 principles with custom CSS
    * **Icons:** Material Design Icons via Google Fonts
    * **Typography:** Roboto font family from Google Fonts
    * **API Integration:** Fetch API for HTTP requests
    * **Browser APIs:** Fullscreen API, Wake Lock API, Keyboard API

* **1.3 Directory Structure:**

    ```
    /public
    ├── admin.html              # Admin panel interface
    ├── admin.css              # Admin panel styles
    ├── admin.js               # Admin panel functionality
    ├── slideshow.html         # Photo slideshow interface
    └── login.html             # Authentication page
    ```

* **1.4. Coding Standards & Conventions:**
    * **Code Style:** ES6+ features, async/await pattern
    * **Naming Conventions:** 
      - Variables: camelCase
      - Functions: camelCase
      - CSS classes: kebab-case
      - IDs: camelCase
    * **File Organization:** Embedded CSS and JavaScript in HTML files for simplicity

---

## 2. Feature Specification: Admin Panel

* **2.1. Feature Overview:** Finder-like file management interface with drag-and-drop upload, folder navigation, and Material Design 3 styling.

* **2.2. Key Components:**
  - **File Explorer Grid:** Fixed 150px x 150px item layout with CSS Grid
  - **Navigation System:** Breadcrumb navigation with back button
  - **Upload Interface:** Drag-and-drop zone with progress indicators
  - **Context Menu:** Right-click operations for files and folders
  - **Toast Notifications:** User feedback for operations

* **2.3. Technical Implementation:**
  - CSS Grid: `repeat(auto-fill, 150px)` with 16px gaps
  - Material Design colors and elevation
  - Fetch API for all server communications
  - Event delegation for dynamic content handling

---

## 3. Feature Specification: Photo Slideshow

* **3.1. Feature Overview:** Full-screen photo display with automatic transitions, keyboard controls, and responsive design for various devices.

* **3.2. Key Components:**
  - **Image Display:** Full-screen image container with object-fit optimization
  - **Control Interface:** Play/pause, next, fullscreen, and info toggle
  - **Progress Indicator:** Visual countdown bar for next image transition
  - **Information Overlay:** Filename and folder display with auto-hide
  - **Keyboard Shortcuts:** Space, arrows, F, and I key bindings

* **3.3. Technical Implementation:**
  - CSS transitions for smooth fade effects (1000ms duration)
  - Wake Lock API to prevent device sleep
  - 15-second automatic advance timer
  - Landscape/portrait orientation detection
  - Error handling with retry logic (5-second delay)

---

## 4. Global Concepts

* **4.1. Authentication & Authorization:** 
  - Session-based authentication for admin panel
  - Automatic redirect to login if unauthorized
  - Public access for slideshow interface

* **4.2. Error Handling:** 
  - Toast notifications for user-facing errors
  - Console logging for development debugging
  - Graceful degradation for unsupported browser features

* **4.3. Responsive Design:**
  - Mobile-first CSS approach
  - Touch-friendly interface elements (min 44px touch targets)
  - Flexible grid layouts for various screen sizes

* **4.4. Accessibility:**
  - Keyboard navigation support
  - Focus indicators for all interactive elements
  - Screen reader friendly HTML structure
  - High contrast color combinations

---

## 5. Browser Compatibility

* **5.1. Supported Browsers:**
  - Chrome 80+
  - Firefox 75+
  - Safari 13+
  - Edge 80+

* **5.2. Progressive Enhancement:**
  - Core functionality works without JavaScript
  - Enhanced features with modern browser APIs
  - Graceful fallbacks for unsupported features

---

## 6. Performance Optimization

* **6.1. Image Loading:**
  - Progressive image loading with loading states
  - Error handling for failed image loads
  - Browser caching for recently viewed images

* **6.2. API Efficiency:**
  - Minimal API calls (only random-image endpoint for slideshow)
  - Efficient polling with abort controller
  - Connection retry logic with exponential backoff

---

## 7. Coding Rules

* Use vanilla JavaScript only (no frameworks or libraries)
* Implement proper error handling for all API calls
* Use CSS Grid and Flexbox for layouts
* Follow Material Design 3 principles for UI design
* Implement responsive design for all screen sizes
* Use semantic HTML5 elements
* Optimize for touch and keyboard interaction
* Implement proper loading states for all operations
* Use CSS custom properties for theming
* Minimize DOM manipulation for better performance
* Implement proper event cleanup to prevent memory leaks