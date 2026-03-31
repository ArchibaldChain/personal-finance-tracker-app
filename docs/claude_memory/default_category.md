# Expense Categorization Skill

This document defines the default **category and subcategory system** for the personal finance tracker.

The goal of this taxonomy is to:

- Provide a clean and intuitive spending classification
- Enable easy statistics and reporting
- Improve automatic categorization (rule-based or LLM-based)
- Keep the system extensible

## Design Principles

1. Categories should represent **major spending domains**
2. Subcategories should represent **common real-world spending patterns**
3. Avoid excessive granularity
4. Allow future extension
5. Maintain compatibility with bank transaction descriptions

---

# Category Structure

## 🍽 Food

Spending related to eating and food consumption.

Subcategories:

- Restaurant
- Takeout / Delivery
- Coffee / Tea
- Fast Food
- Work Meal

---

## 🥦 Groceries

Food and household groceries purchased from supermarkets or markets.

Subcategories:

- Supermarket
- Fresh Market
- Bulk Stores (Costco etc.)
- Alcohol
- Household Groceries

---

## 🛍 Shopping

General shopping and consumer goods.

Subcategories:

- Clothes
- Shoes
- Accessories
- Daily Supplies
- Misc Shopping

---

## 🚗 Transportation

Costs related to daily transportation.

Subcategories:

- Public Transit
- Taxi / Uber
- Bike / Scooter
- Parking
- Train / Bus

---

## 🚙 Car

Expenses related to owning or maintaining a car.

Subcategories:

- Fuel
- Insurance
- Maintenance
- Car Wash
- Parking
- Tolls

---

## ✈️ Travel

Travel-related expenses outside normal daily transportation.

Subcategories:

- Flights
- Hotels
- Local Transport
- Attractions
- Travel Food

---

## 🏠 Housing

Expenses related to housing and home.

Subcategories:

- Rent
- Mortgage
- Property Tax
- Condo / HOA Fee
- Home Repair
- Furniture

---

## ⚡ Utilities

Recurring household utility services.

Subcategories:

- Electricity
- Water
- Gas
- Trash
- Heating
- Internet

---

## 📱 Phone & Internet

Communication-related expenses.

Subcategories:

- Mobile Plan
- Internet
- Phone Purchase
- Phone Accessories

---

## 💊 Health

Medical and healthcare related expenses.

Subcategories:

- Pharmacy
- Doctor Visit
- Dental
- Health Insurance
- Supplements

---

## 💄 Personal Care

Beauty and personal maintenance.

Subcategories:

- Haircut
- Skincare
- Cosmetics
- Salon
- Spa / Massage

---

## 🎮 Entertainment

Leisure and entertainment spending.

Subcategories:

- Movies
- Games
- Streaming Services
- Events
- Hobbies

---

## 📚 Education

Learning and academic related spending.

Subcategories:

- Tuition
- Books
- Online Courses
- School Supplies
- Software / Tools

---

## 🐾 Pet

Expenses related to pets.

Subcategories:

- Pet Food
- Vet
- Pet Supplies
- Grooming
- Pet Services

---

## 💻 Electronics

Electronics and technology purchases.

Subcategories:

- Computer
- Phone
- Tablet
- Accessories
- Software

---

## ⚽ Sports

Fitness and sports-related spending.

Subcategories:

- Gym
- Sports Equipment
- Sports Classes
- Outdoor Activities

---

## 🎁 Gifts & Donations

Money spent for gifts or charitable purposes.

Subcategories:

- Birthday Gift
- Holiday Gift
- Donation
- Charity

---

## 🧧 Red Envelope

Cultural cash gifting (common in Chinese culture).

Subcategories:

- Family
- Friends
- Holiday
- Wedding

---

## 📦 Other

Transactions that cannot be categorized.

Subcategories:

- Miscellaneous
- Uncategorized
- Unknown

---

## 🔁 Transfers

Money movement between accounts that should **not be counted as spending**.

Subcategories:

- Credit Card Payment
- Savings Transfer
- Investment Transfer
- Cash Withdrawal
- Internal Transfer

---

# Usage Rules

## Transaction fields

Each transaction should include:

- category
- subcategory

Example:


Category: Food
Subcategory: Coffee / Tea


## Automatic Categorization

The categorization system can be used by:

- rule-based merchant mapping
- bank MCC code mapping
- LLM classification
- user manual assignment

Example mapping:

| Merchant | Category | Subcategory |
|--------|--------|--------|
| Starbucks | Food | Coffee / Tea |
| Uber | Transportation | Taxi / Uber |
| Walmart | Groceries | Supermarket |

---

## Future Extensions

Possible future improvements:

- Merchant normalization table
- Custom user categories
- Multi-tag transactions
- Split transactions
- Category budget limits
- AI-assisted categorization