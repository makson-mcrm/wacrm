**KM1.20 Design QA**

- Source visual truth:
  - `C:\Users\HP\Documents\mCRM_AI\km1.20-references\02A-contact-desktop.webp` (1536 × 1024)
  - `C:\Users\HP\Documents\mCRM_AI\km1.20-references\00S-embedded-shell.jpg` (1536 × 864)
  - `C:\Users\HP\Documents\mCRM_AI\km1.20-references\00A-shell-desktop.webp`
  - `C:\Users\HP\Documents\mCRM_AI\km1.20-references\00C-shell-mobile.webp` (1145 × 1374)
- Browser-rendered implementation:
  - `C:\Users\HP\Documents\wacrm-local-first\km1.20-contact-desktop.jpg` (1536 × 1024, DPR 1)
  - `C:\Users\HP\Documents\wacrm-local-first\km1.20-contact-mobile.jpg` (390 × 844, DPR 1)
- Combined comparison evidence:
  - `C:\Users\HP\Documents\wacrm-local-first\km1.20-compare-desktop.jpg`
  - `C:\Users\HP\Documents\wacrm-local-first\km1.20-compare-mobile.jpg`
- State: authenticated synthetic contact with linked company, spouse, active deal, activity and note. No production data.
- Primary interactions tested: open Contact, open linked Company, edit first name, save, close, reopen and read back from the local synthetic datastore.
- Console: existing Base UI `nativeButton` warnings remain in shared action components; no failed contact data request.

**Findings**

- [P3] Desktop information density is lower than the 02A reference because the comparison states contain different record counts.
  - Evidence: the synthetic fixture has one Deal, one related person and one note, while 02A demonstrates three Deals and denser task/document/activity groups.
  - Impact: geometry is aligned; exact populated-state rhythm remains a fixture limitation rather than an implementation mismatch.
- [P3] The existing action component labels WhatsApp as “WIADOMOŚĆ”, while 02A says “WhatsApp”.

**Required fidelity surfaces**

- Fonts/typography: hierarchy and compact UI weights are close; desktop body density remains lighter because of fixture volume.
- Spacing/layout rhythm: desktop fixed shell, record header and three-column workspace align; the mobile header and five-item bottom navigation remain visible around the contact card.
- Colors/tokens: dark-green shell, emerald actions, white cards and pale workspace match the approved direction.
- Image quality/assets: no non-standard raster assets were substituted; screenshots were captured at DPR 1.
- Copy/content: approved Polish labels are present except the existing “WIADOMOŚĆ” action label.

**Comparison history**

- Iteration 1: desktop popup inherited the shared Sheet width cap and rendered too narrow. Fixed with explicit desktop shell bounds; post-fix screenshot is `km1.20-contact-desktop.jpg`.
- Iteration 2: mobile Sheet covered the entire viewport. Inset it below/above the reserved mobile shell zones and lowered its mobile stacking layer; the final screenshot retains the 00C header and bottom navigation.

**Implementation checklist**

- Optionally enrich the local synthetic fixture for a denser desktop comparison.

**Follow-up polish**

- Align the WhatsApp action label with 02A after confirming the shared action copy contract.

final result: passed
