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

- [P1] Mobile contact card does not retain the visible 00C header and bottom-navigation chrome.
  - Evidence: the 00C source keeps the logo/search/header and five-item bottom nav visible; the rendered Sheet reserves their vertical space but the portal background obscures that shell chrome.
  - Impact: the mobile state is not yet a 1:1 match to the frozen shared shell.
  - Fix: render the contact record inside the mobile shell content layer (or provide a non-portal mobile record variant) instead of placing it in the shared modal Sheet portal.
- [P2] Desktop information density is lower than the 02A reference.
  - Evidence: the synthetic fixture has one Deal, one related person and one note, while 02A demonstrates three Deals and denser task/document/activity groups.
  - Impact: geometry is aligned, but full populated-state rhythm cannot be confirmed from this fixture.
  - Fix: extend only the local synthetic fixture for the next visual pass; production data must not be used.
- [P3] The existing action component labels WhatsApp as “WIADOMOŚĆ”, while 02A says “WhatsApp”.

**Required fidelity surfaces**

- Fonts/typography: hierarchy and compact UI weights are close; desktop body density remains lighter because of fixture volume.
- Spacing/layout rhythm: desktop fixed shell, record header and three-column workspace align; mobile shell chrome remains blocked as above.
- Colors/tokens: dark-green shell, emerald actions, white cards and pale workspace match the approved direction.
- Image quality/assets: no non-standard raster assets were substituted; screenshots were captured at DPR 1.
- Copy/content: approved Polish labels are present except the existing “WIADOMOŚĆ” action label.

**Comparison history**

- Iteration 1: desktop popup inherited the shared Sheet width cap and rendered too narrow. Fixed with explicit desktop shell bounds; post-fix screenshot is `km1.20-contact-desktop.jpg`.
- Iteration 2: mobile Sheet covered the entire viewport. Inset it below/above the reserved mobile shell zones; the shell chrome itself remains obscured, so the finding stays open.

**Implementation checklist**

- Replace the mobile portal presentation with a shell-contained record presentation.
- Re-capture mobile beside 00C and confirm header/bottom navigation visibility.
- Optionally enrich the local synthetic fixture for a denser desktop comparison.

**Follow-up polish**

- Align the WhatsApp action label with 02A after confirming the shared action copy contract.

final result: blocked
