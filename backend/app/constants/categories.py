# Default category and subcategory data — sourced from docs/default_category.md
# Used by category_service.seed_categories() to populate the DB at startup.
# subcategories is a list of {"name": str, "icon": str} dicts.

CATEGORY_DATA: list[dict] = [
    {
        "name": "Food",
        "icon": "🍽️",
        "subcategories": [
            {"name": "Restaurant", "icon": "🍽️"},
            {"name": "Takeout / Delivery", "icon": "🥡"},
            {"name": "Fast Food", "icon": "🍔"},
            {"name": "Work Meal", "icon": "🥪"},
        ],
    },
    {
        "name": "Snack",
        "icon": "🍿",
        "subcategories": [
            {"name": "Coffee / Tea", "icon": "☕"},
            {"name": "Boba Tea", "icon": "🧋"},
            {"name": "Vending Machine", "icon": "🏧"},
            {"name": "Convenience Store", "icon": "🏪"},
            {"name": "Other Snack", "icon": "🍫"},
        ],
    },
    {
        "name": "Groceries",
        "icon": "🛒",
        "subcategories": [
            {"name": "Walmart", "icon": "🏬"},
            {"name": "T&T Supermarket", "icon": "🥦"},
            {"name": "Superstore", "icon": "🏪"},
            {"name": "Alcohol", "icon": "🍷"},
            {"name": "Household Groceries", "icon": "🧴"},
        ],
    },
    {
        "name": "Shopping",
        "icon": "🛍️",
        "subcategories": [
            {"name": "Clothes", "icon": "👕"},
            {"name": "Shoes", "icon": "👟"},
            {"name": "Accessories", "icon": "👜"},
            {"name": "Daily Supplies", "icon": "🧹"},
            {"name": "Misc Shopping", "icon": "🛍️"},
            {"name": "Dollarama", "icon": "💰"},
        ],
    },
    {
        "name": "Transportation",
        "icon": "🚌",
        "subcategories": [
            {"name": "Public Transit", "icon": "🚌"},
            {"name": "Taxi / Uber", "icon": "🚕"},
            {"name": "Bike / Scooter", "icon": "🚲"},
            {"name": "Parking", "icon": "🅿️"},
            {"name": "Train / Bus", "icon": "🚆"},
        ],
    },
    {
        "name": "Car",
        "icon": "🚗",
        "subcategories": [
            {"name": "Fuel", "icon": "⛽"},
            {"name": "Insurance", "icon": "📋"},
            {"name": "Maintenance", "icon": "🔧"},
            {"name": "Car Wash", "icon": "🚿"},
            {"name": "Parking", "icon": "🅿️"},
            {"name": "Tolls", "icon": "🛣️"},
        ],
    },
    {
        "name": "Travel",
        "icon": "✈️",
        "subcategories": [
            {"name": "Flights", "icon": "✈️"},
            {"name": "Hotels", "icon": "🏨"},
            {"name": "Local Transport", "icon": "🚖"},
            {"name": "Attractions", "icon": "🎡"},
            {"name": "Travel Food", "icon": "🍜"},
        ],
    },
    {
        "name": "Housing",
        "icon": "🏠",
        "subcategories": [
            {"name": "Rent", "icon": "🏠"},
            {"name": "Mortgage", "icon": "🏡"},
            {"name": "Property Tax", "icon": "📜"},
            {"name": "Condo / HOA Fee", "icon": "🏢"},
            {"name": "Home Repair", "icon": "🔨"},
            {"name": "Furniture", "icon": "🛋️"},
        ],
    },
    {
        "name": "Utilities",
        "icon": "💡",
        "subcategories": [
            {"name": "Electricity", "icon": "⚡"},
            {"name": "Water", "icon": "💧"},
            {"name": "Gas", "icon": "🔥"},
            {"name": "Trash", "icon": "🗑️"},
            {"name": "Heating", "icon": "🌡️"},
            {"name": "Internet", "icon": "🌐"},
        ],
    },
    {
        "name": "Phone & Internet",
        "icon": "📱",
        "subcategories": [
            {"name": "Mobile Plan", "icon": "📱"},
            {"name": "Internet", "icon": "🌐"},
            {"name": "Phone Accessories", "icon": "🔌"},
            {"name": "Subscription", "icon": "📲"},
        ],
    },
    {
        "name": "Health",
        "icon": "🏥",
        "subcategories": [
            {"name": "Pharmacy OTC", "icon": "💊"},
            {"name": "Prescription", "icon": "📋"},
            {"name": "Doctor Visit", "icon": "🩺"},
            {"name": "Dental", "icon": "🦷"},
            {"name": "Health Insurance", "icon": "🏥"},
            {"name": "Supplements", "icon": "🧴"},
        ],
    },
    {
        "name": "Personal Care",
        "icon": "💆",
        "subcategories": [
            {"name": "Haircut", "icon": "✂️"},
            {"name": "Skincare", "icon": "🧴"},
            {"name": "Cosmetics", "icon": "💄"},
            {"name": "Salon", "icon": "💅"},
            {"name": "Spa / Massage", "icon": "💆"},
        ],
    },
    {
        "name": "Entertainment",
        "icon": "🎬",
        "subcategories": [
            {"name": "Movies", "icon": "🎬"},
            {"name": "Games", "icon": "🎮"},
            {"name": "Streaming Services", "icon": "📺"},
            {"name": "Events", "icon": "🎟️"},
            {"name": "Hobbies", "icon": "🎨"},
        ],
    },
    {
        "name": "Education",
        "icon": "📚",
        "subcategories": [
            {"name": "Tuition", "icon": "🎓"},
            {"name": "Books", "icon": "📚"},
            {"name": "Online Courses", "icon": "💻"},
            {"name": "School Supplies", "icon": "✏️"},
        ],
    },
    {
        "name": "Pet",
        "icon": "🐾",
        "subcategories": [
            {"name": "Pet Food", "icon": "🐟"},
            {"name": "Vet", "icon": "🩺"},
            {"name": "Pet Supplies", "icon": "🦴"},
            {"name": "Grooming", "icon": "✂️"},
            {"name": "Pet Services", "icon": "🐾"},
        ],
    },
    {
        "name": "Electronics",
        "icon": "💻",
        "subcategories": [
            {"name": "Computer", "icon": "💻"},
            {"name": "Phone", "icon": "📱"},
            {"name": "Tablet", "icon": "📟"},
            {"name": "Accessories", "icon": "🔌"},
            {"name": "Software", "icon": "💿"},
        ],
    },
    {
        "name": "Sports",
        "icon": "🏋️",
        "subcategories": [
            {"name": "Gym", "icon": "🏋️"},
            {"name": "Sports Equipment", "icon": "⚽"},
            {"name": "Sports Classes", "icon": "🏊"},
            {"name": "Outdoor Activities", "icon": "🏕️"},
        ],
    },
    {
        "name": "Gifts & Donations",
        "icon": "🎁",
        "subcategories": [
            {"name": "Birthday Gift", "icon": "🎂"},
            {"name": "Holiday Gift", "icon": "🎁"},
            {"name": "Donation", "icon": "❤️"},
            {"name": "Charity", "icon": "🤝"},
        ],
    },
    {
        "name": "Red Envelope",
        "icon": "🧧",
        "subcategories": [
            {"name": "Family", "icon": "👨‍👩‍👧‍👦"},
            {"name": "Friends", "icon": "👫"},
            {"name": "Holiday", "icon": "🎊"},
            {"name": "Other", "icon": "🧧"},
        ],
    },
    {
        "name": "Other",
        "icon": "📦",
        "subcategories": [
            {"name": "Uncategorized", "icon": "❓"},
            {"name": "Unknown", "icon": "❓"},
        ],
    },
    {
        "name": "Transfers",
        "icon": "💸",
        "subcategories": [
            {"name": "Credit Card Payment", "icon": "💳"},
            {"name": "Savings Transfer", "icon": "🏦"},
            {"name": "Investment Transfer", "icon": "📈"},
            {"name": "Cash Withdrawal", "icon": "💵"},
            {"name": "Internal Transfer", "icon": "🔄"},
            {"name": "E-Transfer", "icon": "🔄"},
        ],
    },
    {
        "name": "Income",
        "icon": "💸",
        "subcategories": [
            {"name": "Cashback", "icon": "💳"},
            {"name": "Interest Income", "icon": "🏦"},
            {"name": "Salary Income", "icon": "📈"},
            {"name": "Other Income", "icon": "💵"},
        ],
    },
]
