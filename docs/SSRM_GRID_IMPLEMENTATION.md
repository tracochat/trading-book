# SSRM Grid Implementation Task List

Development task list for the DataGrid component with Server-Side Row Model (SSRM) support.

## Overview

This document tracks the implementation progress of the reusable DataGrid component. Each task includes acceptance criteria and estimated complexity.

---

## Phase 1: Foundation

### 1.1 Type Definitions & Schemas
**Status:** To Do  
**Complexity:** Medium  
**File:** `components/data-grid/types.ts`

- [ ] Define `DataGridConfig` interface with Zod schema
- [ ] Define `ColumnConfig` interface with all options
- [ ] Define `FilterConfig` types for each filter type
- [ ] Define `PivotState` interface
- [ ] Define `SSRMRequest` and `SSRMResponse` schemas
- [ ] Export all types and Zod validators

**Acceptance Criteria:**
- All interfaces compile without errors
- Zod schemas validate correctly
- Types are exported from `components/data-grid/index.ts`

---

### 1.2 SSRM Types & Utilities
**Status:** To Do  
**Complexity:** Low  
**Files:** `lib/ssrm/types.ts`, `lib/ssrm/utils.ts`

- [ ] Copy/adapt types from `components/data-grid/types.ts`
- [ ] Create utility functions:
  - [ ] `buildFilterCondition()`
  - [ ] `buildSortClause()`
  - [ ] `getColumn()` - resolve field to Drizzle column
  - [ ] `validateSSRMRequest()`

**Acceptance Criteria:**
- All SSRM-specific types are in `lib/ssrm/`
- Utility functions have JSDoc comments
- Unit tests pass (if applicable)

---

### 1.3 Dependencies Setup
**Status:** To Do  
**Complexity:** Low  
**File:** `package.json`

- [ ] Add `@tanstack/react-table` (v8.x)
- [ ] Add `@dnd-kit/core` (v6.x)
- [ ] Add `@dnd-kit/sortable` (v8.x)
- [ ] Verify `zod` is already installed

**Acceptance Criteria:**
- All dependencies install without conflicts
- No peer dependency warnings

---

## Phase 2: Core DataGrid Component

### 2.1 Basic DataGrid Structure
**Status:** To Do  
**Complexity:** Medium  
**Files:** `components/data-grid/index.tsx`, `components/data-grid/data-grid.tsx`

- [ ] Create main `DataGrid` component with props
- [ ] Integrate TanStack Table with `useReactTable`
- [ ] Implement column definitions transformation
- [ ] Set up basic table rendering with shadcn Table
- [ ] Handle client-side data mode

**Acceptance Criteria:**
- DataGrid renders with basic columns and data
- Columns are sortable (client-side)
- Basic styling matches existing table component

---

### 2.2 DataGrid Context
**Status:** To Do  
**Complexity:** Medium  
**File:** `components/data-grid/hooks/use-data-grid.ts`

- [ ] Create `DataGridContext` for shared state
- [ ] Implement `useDataGrid` hook
- [ ] Manage table instance state
- [ ] Handle column visibility state
- [ ] Handle sorting state
- [ ] Handle filter state
- [ ] Handle pagination state

**Acceptance Criteria:**
- All state is accessible via context
- State updates trigger re-renders correctly
- State can be controlled externally

---

### 2.3 Header Cell Component
**Status:** To Do  
**Complexity:** High  
**File:** `components/data-grid/data-grid-header.tsx`

- [ ] Create `DataGridHeaderCell` component
- [ ] Implement sort indicator shadow:
  - [ ] ASC: gradient shadow below text
  - [ ] DESC: gradient shadow above text
  - [ ] Unsorted: no shadow
- [ ] Implement hover state with three-dot filter icon
- [ ] Click on title cycles sort state
- [ ] Click on icon opens filter popover
- [ ] Ensure no layout shift during state changes

**Acceptance Criteria:**
- Sort indicator is visible only when sorted
- Filter icon appears only on hover
- Table layout remains stable during interactions
- Sort cycles correctly: none -> asc -> desc -> none

---

### 2.4 Filter Popover Component
**Status:** To Do  
**Complexity:** High  
**File:** `components/data-grid/data-grid-filter-popover.tsx`

- [ ] Create filter popover shell using Radix Popover
- [ ] Implement text filter input
- [ ] Implement number filter (with operator selector)
- [ ] Implement date filter (single and range)
- [ ] Implement select filter (dropdown)
- [ ] Implement multiselect filter (checkboxes)
- [ ] Add "Apply" and "Clear" buttons
- [ ] Support combined conditions (AND/OR)

**Acceptance Criteria:**
- Each filter type renders correctly
- Filters apply on "Apply" button click
- "Clear" resets the filter
- Popover closes on apply/clear
- Filter state is reflected in column header (indicator)

---

## Phase 3: Server-Side Row Model

### 3.1 Table Registry
**Status:** To Do  
**Complexity:** Low  
**File:** `lib/ssrm/registry.ts`

- [ ] Create `tableRegistry` with trades, accounts, instruments
- [ ] Define relations for each table
- [ ] Define field mappings for nested fields
- [ ] Define searchable fields per table

**Acceptance Criteria:**
- All required tables are registered
- Relations are correctly configured
- Field mappings work for `instrument.symbol`, etc.

---

### 3.2 Drizzle Query Builder
**Status:** To Do  
**Complexity:** Very High  
**File:** `lib/ssrm/query-builder.ts`

- [ ] Implement `buildSSRMQuery()` main function
- [ ] Implement `buildWhereConditions()` for filter model
- [ ] Implement `buildGlobalSearchCondition()`
- [ ] Implement `buildGroupQuery()` for grouped data
- [ ] Implement `calculateTotals()` for aggregations
- [ ] Handle joins for relations
- [ ] Handle nested field paths
- [ ] Implement proper null handling in sorts

**Acceptance Criteria:**
- Simple queries execute correctly
- Filters work for all operators
- Sorting works with nulls handled
- Pagination returns correct rows
- Grouping returns correct aggregations
- Global search searches across configured fields

---

### 3.3 SSRM API Endpoint
**Status:** To Do  
**Complexity:** Medium  
**File:** `app/api/ssrm/route.ts`

- [ ] Create POST handler
- [ ] Validate request with Zod
- [ ] Check table access against registry
- [ ] Call query builder
- [ ] Return SSRMResponse
- [ ] Handle errors gracefully
- [ ] Add query timing metadata

**Acceptance Criteria:**
- API returns 400 for invalid requests
- API returns 403 for unauthorized tables
- API returns correct data for valid requests
- Error messages are helpful but not revealing

---

### 3.4 SSRM Hook
**Status:** To Do  
**Complexity:** High  
**File:** `components/data-grid/hooks/use-ssrm.ts`

- [ ] Create `useSSRM` hook
- [ ] Implement debounced fetching
- [ ] Handle loading state
- [ ] Handle error state
- [ ] Cache recent requests
- [ ] Integrate with TanStack Table manual mode
- [ ] Handle server-side sorting
- [ ] Handle server-side filtering
- [ ] Handle server-side pagination

**Acceptance Criteria:**
- Data fetches on initial load
- Debounce prevents excessive requests
- Loading state shows during fetch
- Errors are handled and displayed
- Table updates when server data changes

---

## Phase 4: Toolbar & Pagination

### 4.1 Toolbar Component
**Status:** To Do  
**Complexity:** Medium  
**File:** `components/data-grid/data-grid-toolbar.tsx`

- [ ] Create toolbar layout
- [ ] Implement global search input
- [ ] Add column visibility dropdown menu
- [ ] Add pivot panel toggle button
- [ ] Support custom filter controls from config
- [ ] Support custom action buttons slot

**Acceptance Criteria:**
- Search filters data in real-time (debounced)
- Column toggle shows/hides columns
- Pivot toggle shows/hides pivot panel
- Custom filters work as configured
- Custom actions render in correct position

---

### 4.2 Pagination Component
**Status:** To Do  
**Complexity:** Medium  
**File:** `components/data-grid/data-grid-pagination.tsx`

- [ ] Create pagination layout
- [ ] Show page size selector
- [ ] Show current page / total pages
- [ ] Show row count summary
- [ ] Implement page navigation buttons
- [ ] Handle server-side pagination state

**Acceptance Criteria:**
- Page size changes trigger re-fetch
- Navigation works correctly
- Row count shows "X of Y rows"
- Disabled states when at bounds

---

## Phase 5: Grouping & Pivot

### 5.1 Row Group Rendering
**Status:** To Do  
**Complexity:** High  
**File:** `components/data-grid/data-grid-row-group.tsx`

- [ ] Create `DataGridRowGroup` component
- [ ] Render group row with expand/collapse
- [ ] Show group value and child count
- [ ] Show aggregated values
- [ ] Handle nested groups (multi-level)
- [ ] Lazy load children on expand

**Acceptance Criteria:**
- Groups render with correct styling
- Expand/collapse works
- Nested groups indent correctly
- Aggregations display in value columns
- Children load on expand (not eagerly)

---

### 5.2 Pivot Panel Component
**Status:** To Do  
**Complexity:** Very High  
**File:** `components/data-grid/data-grid-pivot-panel.tsx`

- [ ] Create panel layout (Sheet or resizable panel)
- [ ] Implement "Available Fields" list
- [ ] Implement "Row Groups" drop zone
- [ ] Implement "Column Groups" drop zone
- [ ] Implement "Values" drop zone with agg selector
- [ ] Implement "Filters" drop zone
- [ ] Add drag-and-drop with @dnd-kit
- [ ] Implement Apply/Reset buttons

**Acceptance Criteria:**
- Fields can be dragged between zones
- Drop zones accept valid fields only
- Value columns show aggregation selector
- Apply triggers re-fetch with pivot config
- Reset clears pivot configuration

---

### 5.3 Pivot Hook
**Status:** To Do  
**Complexity:** Medium  
**File:** `components/data-grid/hooks/use-pivot.ts`

- [ ] Create `usePivot` hook
- [ ] Manage pivot state (rowGroups, columnGroups, values, filters)
- [ ] Transform pivot state to SSRM request format
- [ ] Handle pivot result columns
- [ ] Persist pivot state (optional)

**Acceptance Criteria:**
- Pivot state is correctly managed
- State transforms to valid SSRM request
- Dynamic columns from pivot results render

---

## Phase 6: Integration

### 6.1 Replace trades-client.tsx Table
**Status:** To Do  
**Complexity:** High  
**File:** `app/dashboard/trades/trades-client.tsx`

- [ ] Create trade column definitions
- [ ] Configure toolbar with existing filters:
  - [ ] Account filter
  - [ ] Trade type filter
  - [ ] Date range picker
- [ ] Preserve existing functionality:
  - [ ] New Trade button
  - [ ] Import button
  - [ ] Edit/Delete row actions
- [ ] Wire up to SSRM endpoint
- [ ] Test all features work

**Acceptance Criteria:**
- Table renders trades correctly
- Sorting works (server-side)
- Filtering works (server-side)
- Pagination works (server-side)
- Row actions (edit/delete) work
- New Trade dialog works
- Import button works
- No regression from current functionality

---

### 6.2 Update trades page.tsx
**Status:** To Do  
**Complexity:** Low  
**File:** `app/dashboard/trades/page.tsx`

- [ ] Remove redundant data fetching (SSRM handles it)
- [ ] Pass only configuration props
- [ ] Keep account/instrument lists for filters

**Acceptance Criteria:**
- Page loads without errors
- Data fetches via SSRM
- Initial render is fast

---

## Phase 7: Polish & Documentation

### 7.1 Error Handling
**Status:** To Do  
**Complexity:** Medium  

- [ ] Add error boundaries around DataGrid
- [ ] Show error states in UI
- [ ] Handle network errors gracefully
- [ ] Add retry mechanism

**Acceptance Criteria:**
- Errors don't crash the page
- User sees helpful error messages
- Retry button appears on failure

---

### 7.2 Loading States
**Status:** To Do  
**Complexity:** Low  

- [ ] Add skeleton loading for table
- [ ] Add loading indicator for pagination
- [ ] Add loading indicator for group expansion

**Acceptance Criteria:**
- Skeleton shows during initial load
- Subtle indicator during re-fetches
- No layout shift when loading

---

### 7.3 Accessibility
**Status:** To Do  
**Complexity:** Medium  

- [ ] Add ARIA attributes to table
- [ ] Add keyboard navigation
- [ ] Add screen reader announcements
- [ ] Test with screen reader

**Acceptance Criteria:**
- Table is navigable by keyboard
- Sort/filter actions are accessible
- Screen readers announce changes

---

### 7.4 Component Documentation
**Status:** To Do  
**Complexity:** Low  

- [ ] Add JSDoc to all exported functions
- [ ] Create usage examples in docs
- [ ] Document all configuration options

**Acceptance Criteria:**
- All exports have JSDoc
- Examples are copy-paste ready
- Options are fully documented

---

## Testing Checklist

### Unit Tests
- [ ] Type validation with Zod
- [ ] Filter condition building
- [ ] Sort clause building
- [ ] Utility functions

### Integration Tests
- [ ] SSRM API endpoint
- [ ] Query builder with test database
- [ ] DataGrid with mock data

### E2E Tests
- [ ] Trades page loads
- [ ] Sorting works
- [ ] Filtering works
- [ ] Pagination works
- [ ] Row actions work

---

## Progress Summary

| Phase | Tasks | Completed | Progress |
|-------|-------|-----------|----------|
| 1. Foundation | 3 | 0 | 0% |
| 2. Core DataGrid | 4 | 0 | 0% |
| 3. SSRM | 4 | 0 | 0% |
| 4. Toolbar & Pagination | 2 | 0 | 0% |
| 5. Grouping & Pivot | 3 | 0 | 0% |
| 6. Integration | 2 | 0 | 0% |
| 7. Polish | 4 | 0 | 0% |
| **Total** | **22** | **0** | **0%** |

---

## Notes

- Priority: Focus on Phases 1-3 first for MVP
- Phase 5 (Pivot) can be deferred if time-constrained
- Test with real trades data early to catch issues
- Consider virtual scrolling for very large datasets (future enhancement)
