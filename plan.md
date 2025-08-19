# Website UI Transformation Plan

## Overview
Transform the current complex admin dashboard into a clean, modern interface based on the provided screenshots. The new design emphasizes simplicity and focuses on core functionality.

## Design Analysis from Screenshots

### 1. Main Admin Dashboard (Screenshot 1)
- **Header**: Simple "Administration" title
- **Navigation**: Two tabs - "Manage Contests" and "Manage Problems" (was "Manage Challenges")
- **Search Bar**: Top-right search functionality
- **Main Content**: Clean empty state with message "You have not created any problems"
- **Action Button**: Green "Create Problem" button (top-right)
- **Footer**: Simple link navigation at bottom

### 2. Create Problem Form (Screenshot 2)
- **Breadcrumb**: "Manage Problems > Create"
- **Form Title**: "Create Problem"
- **Form Fields**:
  - Problem Name (text input)
  - Description (rich text editor with toolbar)
  - Problem Statement (rich text editor)
  - Input Format (rich text editor)
  - Constraints (rich text editor)
  - Output Format (rich text editor)
  - Tags (tag input field)
- **Action Button**: Green "Save Problem" button

### 3. Problem Management Tabs (Screenshot 3)
- **Breadcrumb**: "Manage Problems > [problem-name]"
- **Tabs**: Only "Details" and "Test Cases" (remove all other tabs)
- **Test Cases Section**:
  - Instructions about adding test cases
  - Warning message when no test cases exist
  - Green "Add Test Case" button
  - Table headers: Order, Input, Output, Tag, Sample, Additional, Strength, Select

### 4. Add Test Case Modal (Screenshot 4)
- **Modal Title**: "Add Test Case"
- **Fields**:
  - Tag (text input)
  - Strength (number input, default: 10)
  - Sample checkbox
  - Additional checkbox
  - Input section with editor/upload toggle (STDIN)
  - Output section with editor/upload toggle (STDOUT)
- **Action**: Green "Save" button

### 5. Contest Management (Screenshot 5)
- **Breadcrumb**: "Manage Contests > [contest-name]"
- **Contest Title**: Display contest name with URL
- **Tabs**: Only "Details", "Teams", and "Problems" (remove other tabs)
- **Contest Details Form**:
  - Contest Name
  - Contest URL
  - Start Time (date + time)
  - End Time (date + time)
  - Organization Type dropdown
  - Organization Name
- **Actions**: "Preview Landing Page", "Preview Problems Page", "Save Changes"

## Implementation Plan

### Phase 1: Admin Dashboard Redesign
1. **Replace AdminDashboardPage.tsx**
   - Remove all current widgets and monitoring components
   - Implement clean two-tab layout: "Manage Contests" and "Manage Problems"
   - Add search functionality
   - Create empty state for problems/contests
   - Style with clean, minimal design

2. **Update Navigation**
   - Simplify AdminLayout component
   - Remove complex sidebar navigation
   - Implement tab-based navigation
   - Add breadcrumb component

### Phase 2: Problem Management System
1. **Create New Problem Pages**
   - `CreateProblemPage.tsx` - Form with rich text editors
   - `ProblemDetailPage.tsx` - Tabbed interface (Details + Test Cases)
   - `ProblemListPage.tsx` - List view for problems

2. **Rich Text Editor Integration**
   - Install and configure rich text editor (React Quill or similar)
   - Implement toolbar with formatting options
   - Add preview functionality

3. **Test Case Management**
   - `TestCaseModal.tsx` - Modal for adding/editing test cases
   - STDIN/STDOUT input interfaces
   - File upload capability
   - Test case validation

### Phase 3: Contest Management Redesign
1. **Simplify Contest Interface**
   - Remove complex monitoring and control panels
   - Focus on three tabs: Details, Teams, Problems
   - Clean form-based interface
   - Date/time pickers for scheduling

2. **Contest Creation/Editing**
   - Streamlined form with essential fields only
   - Real-time URL preview
   - Organization management

### Phase 4: Backend API Updates
1. **Problem API Endpoints**
   - `POST /api/admin/problems` - Create problem
   - `GET /api/admin/problems` - List problems
   - `PUT /api/admin/problems/:id` - Update problem
   - `DELETE /api/admin/problems/:id` - Delete problem

2. **Test Case API Endpoints**
   - `POST /api/admin/problems/:id/testcases` - Add test case
   - `GET /api/admin/problems/:id/testcases` - List test cases
   - `PUT /api/admin/testcases/:id` - Update test case
   - `DELETE /api/admin/testcases/:id` - Delete test case

3. **Enhanced Contest API**
   - Simplify contest creation/update endpoints
   - Remove complex monitoring endpoints
   - Focus on core CRUD operations

### Phase 5: Database Schema Updates
1. **Problems Table Enhancements**
   - Add rich text fields for problem statement, constraints, etc.
   - Add tags support
   - Add difficulty levels

2. **Test Cases Table**
   - Enhance with strength, tag, and additional fields
   - Support for file-based test cases
   - Sample test case marking

### Phase 6: UI Component Library
1. **Shared Components**
   - `RichTextEditor.tsx` - Reusable rich text editor
   - `TagInput.tsx` - Tag input component
   - `DateTimePicker.tsx` - Date and time selection
   - `Modal.tsx` - Consistent modal component
   - `Breadcrumb.tsx` - Navigation breadcrumb

2. **Form Components**
   - Standardized form styling
   - Input validation components
   - File upload components

## File Structure Changes

```
frontend/src/
├── pages/
│   ├── admin/
│   │   ├── AdminDashboardPage.tsx (redesigned)
│   │   ├── problems/
│   │   │   ├── ProblemsListPage.tsx
│   │   │   ├── CreateProblemPage.tsx
│   │   │   └── ProblemDetailPage.tsx
│   │   └── contests/
│   │       ├── ContestsListPage.tsx
│   │       ├── CreateContestPage.tsx
│   │       └── ContestDetailPage.tsx
├── components/
│   ├── common/
│   │   ├── RichTextEditor.tsx
│   │   ├── TagInput.tsx
│   │   ├── DateTimePicker.tsx
│   │   ├── Modal.tsx
│   │   └── Breadcrumb.tsx
│   └── admin/
│       ├── TestCaseModal.tsx
│       ├── ProblemForm.tsx
│       └── ContestForm.tsx
```

## Styling Guidelines

1. **Color Scheme**
   - Primary green: #28a745 (for buttons and accents)
   - Clean whites and light grays for backgrounds
   - Minimal use of colors, focus on typography

2. **Typography**
   - Clean, modern font stack
   - Clear hierarchy with proper font weights
   - Adequate spacing and line heights

3. **Layout**
   - Generous white space
   - Consistent margins and padding
   - Responsive design principles
   - Card-based layouts where appropriate

## Migration Strategy

1. **Phase 1**: Create new clean admin dashboard (2-3 days)
2. **Phase 2**: Implement problem management (3-4 days)
3. **Phase 3**: Redesign contest management (2-3 days)
4. **Phase 4**: Backend API development (2-3 days)
5. **Phase 5**: Database migrations (1 day)
6. **Phase 6**: Polish and testing (2 days)

**Total Estimated Time: 12-16 days**

## Success Criteria

- ✅ Clean, minimal admin interface
- ✅ Intuitive problem creation and management
- ✅ Simplified contest management
- ✅ Rich text editing capabilities
- ✅ Efficient test case management
- ✅ Mobile-responsive design
- ✅ Fast loading times
- ✅ Consistent user experience

## Risk Mitigation

1. **Rich Text Editor Integration**: Test multiple libraries before committing
2. **Data Migration**: Ensure backward compatibility during transition
3. **User Training**: Document new interface for existing users
4. **Performance**: Monitor bundle size with new components
5. **Browser Compatibility**: Test across different browsers

This plan transforms the current complex dashboard into a clean, focused interface that matches the provided screenshots while maintaining all essential functionality.