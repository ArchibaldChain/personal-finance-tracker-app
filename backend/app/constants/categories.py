# Default category and subcategory data — sourced from docs/default_category.md
# Used by category_service.seed_categories() to populate the DB at startup.

CATEGORY_DATA: list[dict] = [
    {
        "name": "Food",
        "subcategories": ["Restaurant", "Takeout / Delivery", "Coffee / Tea", "Fast Food", "Work Meal"],
    },
    {
        "name": "Groceries",
        "subcategories": ["Supermarket", "Fresh Market", "Bulk Stores", "Alcohol", "Household Groceries"],
    },
    {
        "name": "Shopping",
        "subcategories": ["Clothes", "Shoes", "Accessories", "Daily Supplies", "Misc Shopping"],
    },
    {
        "name": "Transportation",
        "subcategories": ["Public Transit", "Taxi / Uber", "Bike / Scooter", "Parking", "Train / Bus"],
    },
    {
        "name": "Car",
        "subcategories": ["Fuel", "Insurance", "Maintenance", "Car Wash", "Parking", "Tolls"],
    },
    {
        "name": "Travel",
        "subcategories": ["Flights", "Hotels", "Local Transport", "Attractions", "Travel Food"],
    },
    {
        "name": "Housing",
        "subcategories": ["Rent", "Mortgage", "Property Tax", "Condo / HOA Fee", "Home Repair", "Furniture"],
    },
    {
        "name": "Utilities",
        "subcategories": ["Electricity", "Water", "Gas", "Trash", "Heating", "Internet"],
    },
    {
        "name": "Phone & Internet",
        "subcategories": ["Mobile Plan", "Internet", "Phone Purchase", "Phone Accessories"],
    },
    {
        "name": "Health",
        "subcategories": ["Pharmacy", "Doctor Visit", "Dental", "Health Insurance", "Supplements"],
    },
    {
        "name": "Personal Care",
        "subcategories": ["Haircut", "Skincare", "Cosmetics", "Salon", "Spa / Massage"],
    },
    {
        "name": "Entertainment",
        "subcategories": ["Movies", "Games", "Streaming Services", "Events", "Hobbies"],
    },
    {
        "name": "Education",
        "subcategories": ["Tuition", "Books", "Online Courses", "School Supplies", "Software / Tools"],
    },
    {
        "name": "Pet",
        "subcategories": ["Pet Food", "Vet", "Pet Supplies", "Grooming", "Pet Services"],
    },
    {
        "name": "Electronics",
        "subcategories": ["Computer", "Phone", "Tablet", "Accessories", "Software"],
    },
    {
        "name": "Sports",
        "subcategories": ["Gym", "Sports Equipment", "Sports Classes", "Outdoor Activities"],
    },
    {
        "name": "Gifts & Donations",
        "subcategories": ["Birthday Gift", "Holiday Gift", "Donation", "Charity"],
    },
    {
        "name": "Red Envelope",
        "subcategories": ["Family", "Friends", "Holiday", "Wedding"],
    },
    {
        "name": "Other",
        "subcategories": ["Miscellaneous", "Uncategorized", "Unknown"],
    },
    {
        "name": "Transfers",
        "subcategories": [
            "Credit Card Payment",
            "Savings Transfer",
            "Investment Transfer",
            "Cash Withdrawal",
            "Internal Transfer",
        ],
    },
]
