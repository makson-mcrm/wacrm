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
- State: authenticated synthetic contact with three active Deals, three tasks, three documents, four activities, three notes, three related people and four relationship rows. No production data.
- Primary interactions tested: open Contact, follow linked records, edit the synthetic description, save, close, reopen and read the exact value back from the local synthetic datastore.
- Console: existing Base UI `nativeButton` warnings remain in shared action components; no failed contact data request.

**Findings**

- [P3] 02A still shows six task rows and four document rows, while the verified synthetic state deliberately uses the requested minimum of three for each group.
- [P3] The approved 02A activity rows are more compact; the implementation keeps the existing shared `ActivityHistory` cards in a bounded scroll region.
- [P3] The 02A right column is slightly wider relative to the center column; the implementation keeps balanced minimum widths so existing long CRM labels remain readable.

**Required fidelity surfaces**

- Fonts/typography: hierarchy and compact UI weights are close; exact font metrics still differ from the raster reference.
- Spacing/layout rhythm: desktop fixed shell, record header and three-column workspace align; the mobile header and five-item bottom navigation remain visible around the contact card.
- Colors/tokens: dark-green shell, emerald actions, white cards and pale workspace match the approved direction.
- Image quality/assets: no non-standard raster assets were substituted; screenshots were captured at DPR 1.
- Copy/content: the Contact action now uses the approved “WhatsApp” label without changing the shared action's default elsewhere.

**Comparison history**

- Iteration 1: desktop popup inherited the shared Sheet width cap and rendered too narrow. Fixed with explicit desktop shell bounds; post-fix screenshot is `km1.20-contact-desktop.jpg`.
- Iteration 2: mobile Sheet covered the entire viewport. Inset it below/above the reserved mobile shell zones and lowered its mobile stacking layer; the final screenshot retains the 00C header and bottom navigation.
- Iteration 3: expanded the local-only synthetic fixture and balanced the three desktop columns. The current comparison contains 02A, 00S and the browser-rendered PR #18 state side by side.

final result: technical preview and persistence passed; visual 1:1 is not claimed while the three documented P3 differences remain visible
