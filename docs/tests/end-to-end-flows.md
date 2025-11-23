# End-to-End / Integration Tests

**Target:** Full Application Flow

## Goal
Verify that the components work together to perform the batch renaming task.

## Test Cases to Implement

### Full Flow
- [ ] **Select -> Preview -> Rename**:
    1.  Mock file selection of multiple files.
    2.  Enter find/replace criteria.
    3.  Verify preview updates in the file list.
    4.  Click "Rename Files".
    5.  Verify backend is called with correct parameters.
    6.  Verify UI updates to show success status.

### Error Handling Flow
- [ ] **Collision Detection**:
    1.  Select files `a.txt` and `b.txt`.
    2.  Rename `a` to `b`.
    3.  Verify "Rename Files" button is disabled.
    4.  Verify collision warning is shown in the list.

- [ ] **Backend Failure**:
    1.  Setup mock to fail the rename operation.
    2.  Trigger rename.
    3.  Verify error alert/notification is displayed.
    4.  Verify file status updates to 'error'.

### Advanced Flows
- [ ] **Regex Workflow**:
    1.  Enable Regex Mode.
    2.  Enter valid regex with groups.
    3.  Verify preview shows correct substitution.
    4.  Enter invalid regex.
    5.  Verify error is shown and rename is disabled.
