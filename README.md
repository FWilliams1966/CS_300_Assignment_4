Fabian Williams
I choose option B for this assignment as I believe I could create more ideas for this ratings component application.
https://github.com/FWilliams1966/CS_300_Assignment_4.git.
Run it from the folder that contains package.json:

Open a terminal in c:\Users\fabid\OneDrive\Desktop\CS_300_Assignment_4\CS_300_Assignment_4
Install dependencies: npm install
Start the dev server: npm run dev
Open the local URL Vite prints in the terminal, usually http://localhost:5173
### Props Documentation: RatingStars

Component Name: RatingStars

| Prop | Type | Default | Required | Description |
|---|---|---|---|---|
| totalStars | number | 5 | No | Number of stars to display. Values are normalized to at least 1. |
| initialRatings | number or array | 0 | No | Initial selected value. If an array is passed, the first item is used. |
| onRatingChange | function | none | No | Callback fired when a user selects a rating. Receives the selected number. |
| readOnly | boolean | false | No | Disables interaction when true. |
| label | string | Rating | No | Label used for accessibility text and storage key naming. |

Behavior Notes
- totalStars is sanitized before render.
- initialRatings is clamped into valid range.
- Rating is persisted in localStorage per label.
- Escape key toggles visibility of the card.
- onRatingChange only runs when a valid function is provided.

Example Usage
RatingStars with custom values:
- totalStars: 10
- initialRatings: 7
- label: Overall Satisfaction
- readOnly: false
- onRatingChange: handleRatingChange
- <img width="1177" height="547" alt="image" src="https://github.com/user-attachments/assets/b22038f4-a637-4cbd-a54f-910ccd9858af" />
<img width="1184" height="626" alt="image" src="https://github.com/user-attachments/assets/ff1f01cd-7e22-4ca5-9419-f978a03ee722" />
<img width="1187" height="626" alt="image" src="https://github.com/user-attachments/assets/56f90268-d1be-44f5-acdd-25df35a79cf0" />
<img width="1163" height="619" alt="image" src="https://github.com/user-attachments/assets/a1dc6c4e-925b-42d1-806f-4ed90fb06147" />
<img width="1176" height="627" alt="image" src="https://github.com/user-attachments/assets/6b08f69d-b607-4443-8f98-f0c2b5bc7049" />
<img width="1278" height="620" alt="image" src="https://github.com/user-attachments/assets/b18078db-8cba-4bce-9222-a20504d770b1" />
<img width="1234" height="620" alt="image" src="https://github.com/user-attachments/assets/74adf3d3-e8f1-44d8-86bb-3cf5abdc49de" />
