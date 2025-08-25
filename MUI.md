# MUI Components Usage Analysis

This document lists all files and components that still use Material-UI (MUI) components in the codebase.

## Files/Components that still use MUI:

### **Core Components:**
- **`frontend/src/components/common/TagInput.tsx`** - Uses MUI material components and Add icon
- **`frontend/src/components/common/RichTextEditor.tsx`** - Uses MUI material components and icons
- **`frontend/src/components/common/Breadcrumb.tsx`** - Uses Box, Typography, Link, and ChevronRight icon

### **Layout Components:**
- **`frontend/src/components/Layout/AdminLayout.tsx`** - Extensive MUI usage with material components and icons

### **Admin Components:**
- **`frontend/src/components/Admin/AddProblemModal.tsx`** - Uses MUI modal components and icons
- **`frontend/src/components/Admin/TestCaseModal.tsx`** - Uses MUI modal components and Close icon
- **`frontend/src/components/Admin/ProblemPointsModal.tsx`** - Uses MUI material components
- **`frontend/src/components/Admin/ContestControlPanel.tsx`** - Uses MUI components and icons
- **`frontend/src/components/Admin/SystemMonitoringDashboard.tsx`** - Uses MUI components and icons
- **`frontend/src/components/Admin/SubmissionFeedDisplay.tsx`** - Uses MUI components and icons
- **`frontend/src/components/Admin/TeamRegistrationMonitor.tsx`** - Uses MUI components and icons
- **`frontend/src/components/Admin/ContestOverviewWidget.tsx`** - Uses MUI components and icons

### **Feature Components:**
- **`frontend/src/components/RealTimeLeaderboard/RealTimeLeaderboard.tsx`** - Uses MUI components and icons
- **`frontend/src/components/RealTimeSubmissions/RealTimeSubmissions.tsx`** - Uses MUI components and icons
- **`frontend/src/components/ConnectionStatus/ConnectionStatus.tsx`** - Uses MUI components and icons
- **`frontend/src/components/NotificationSystem/NotificationSystem.tsx`** - Uses MUI components and icons

### **Pages:**
- **`frontend/src/pages/CreateContestPage.tsx`** - Uses MUI components and icons
- **`frontend/src/pages/admin/contests/ContestDetailPage.tsx`** - Uses MUI components and icons
- **`frontend/src/pages/ProblemDetailPage.tsx`** - Uses MUI components and icons
- **`frontend/src/pages/ContestsPage.tsx`** - Uses MUI components and icons
- **`frontend/src/pages/CodeEditorTestPage.tsx`** - Uses MUI components and Code icon

### **Legacy/Old Files:**
- **`frontend/src/pages/ProblemViewPage_Old.tsx`** - Old component with MUI usage
- **`frontend/src/pages/DashboardPage_old.tsx`** - Old component with MUI usage

**Total: 23 files** still using MUI components across your frontend application.

## Migration Priority

Consider migrating components in this order:
1. **Core Components** - Most reused across the application
2. **Layout Components** - Foundation for other components
3. **Admin Components** - Admin-specific functionality
4. **Feature Components** - User-facing features
5. **Pages** - Individual page implementations
6. **Legacy Files** - Can be removed or updated last