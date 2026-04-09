# Default category and subcategory data — sourced from docs/default_category.md
# Used by category_service.seed_categories() to populate the DB at startup.
# icon values are Lucide icon name strings (https://lucide.dev/icons/).
# subcategories is a list of {"name": str, "icon": str} dicts.

CATEGORY_DATA: list[dict] = [
    {
        "name": "Food",
        "icon": "UtensilsCrossed",
        "subcategories": [
            {"name": "Restaurant", "icon": "UtensilsCrossed"},
            {"name": "Takeout / Delivery", "icon": "PackageOpen"},
            {"name": "Fast Food", "icon": "Sandwich"},
            {"name": "Work Meal", "icon": "BriefcaseBusiness"},
        ],
    },
    {
        "name": "Snack",
        "icon": "Cookie",
        "subcategories": [
            {"name": "Coffee / Tea", "icon": "Coffee"},
            {"name": "Boba Tea", "icon": "GlassWater"},
            {"name": "Vending Machine", "icon": "ShoppingCart"},
            {"name": "Convenience Store", "icon": "Store"},
            {"name": "Other Snack", "icon": "Cookie"},
        ],
    },
    {
        "name": "Groceries",
        "icon": "ShoppingCart",
        "subcategories": [
            {"name": "Walmart", "icon": "Store"},
            {"name": "T&T Supermarket", "icon": "Store"},
            {"name": "Superstore", "icon": "Store"},
            {"name": "Alcohol", "icon": "Wine"},
            {"name": "Household Groceries", "icon": "ShoppingBasket"},
        ],
    },
    {
        "name": "Shopping",
        "icon": "ShoppingBag",
        "subcategories": [
            {"name": "Clothes", "icon": "Shirt"},
            {"name": "Shoes", "icon": "Footprints"},
            {"name": "Accessories", "icon": "Watch"},
            {"name": "Daily Supplies", "icon": "Package"},
            {"name": "Misc Shopping", "icon": "ShoppingBag"},
            {"name": "Dollarama", "icon": "Tag"},
        ],
    },
    {
        "name": "Transportation",
        "icon": "Bus",
        "subcategories": [
            {"name": "Public Transit", "icon": "Bus"},
            {"name": "Taxi / Uber", "icon": "Car"},
            {"name": "Bike / Scooter", "icon": "Bike"},
            {"name": "Parking", "icon": "ParkingCircle"},
            {"name": "Train / Bus", "icon": "TrainFront"},
        ],
    },
    {
        "name": "Car",
        "icon": "Car",
        "subcategories": [
            {"name": "Fuel", "icon": "Fuel"},
            {"name": "Insurance", "icon": "Shield"},
            {"name": "Maintenance", "icon": "Wrench"},
            {"name": "Car Wash", "icon": "Droplets"},
            {"name": "Parking", "icon": "ParkingCircle"},
            {"name": "Tolls", "icon": "Milestone"},
        ],
    },
    {
        "name": "Travel",
        "icon": "Plane",
        "subcategories": [
            {"name": "Flights", "icon": "Plane"},
            {"name": "Hotels", "icon": "BedDouble"},
            {"name": "Local Transport", "icon": "Car"},
            {"name": "Attractions", "icon": "Ticket"},
            {"name": "Travel Food", "icon": "UtensilsCrossed"},
        ],
    },
    {
        "name": "Housing",
        "icon": "House",
        "subcategories": [
            {"name": "Rent", "icon": "House"},
            {"name": "Mortgage", "icon": "Building"},
            {"name": "Property Tax", "icon": "FileText"},
            {"name": "Condo / HOA Fee", "icon": "Building2"},
            {"name": "Home Repair", "icon": "Hammer"},
            {"name": "Furniture", "icon": "Armchair"},
        ],
    },
    {
        "name": "Utilities",
        "icon": "Zap",
        "subcategories": [
            {"name": "Electricity", "icon": "Zap"},
            {"name": "Water", "icon": "Droplets"},
            {"name": "Gas", "icon": "Flame"},
            {"name": "Trash", "icon": "Trash2"},
            {"name": "Heating", "icon": "Thermometer"},
            {"name": "Internet", "icon": "Wifi"},
        ],
    },
    {
        "name": "Phone & Internet",
        "icon": "Smartphone",
        "subcategories": [
            {"name": "Mobile Plan", "icon": "Smartphone"},
            {"name": "Internet", "icon": "Wifi"},
            {"name": "Phone Accessories", "icon": "Cable"},
            {"name": "Subscription", "icon": "RefreshCcw"},
        ],
    },
    {
        "name": "Health",
        "icon": "HeartPulse",
        "subcategories": [
            {"name": "Pharmacy OTC", "icon": "Pill"},
            {"name": "Prescription", "icon": "ClipboardPlus"},
            {"name": "Doctor Visit", "icon": "Stethoscope"},
            {"name": "Dental", "icon": "Smile"},
            {"name": "Health Insurance", "icon": "HeartPulse"},
            {"name": "Supplements", "icon": "FlaskConical"},
        ],
    },
    {
        "name": "Personal Care",
        "icon": "Sparkles",
        "subcategories": [
            {"name": "Haircut", "icon": "Scissors"},
            {"name": "Skincare", "icon": "Sparkles"},
            {"name": "Cosmetics", "icon": "Palette"},
            {"name": "Salon", "icon": "Scissors"},
            {"name": "Spa / Massage", "icon": "Waves"},
        ],
    },
    {
        "name": "Entertainment",
        "icon": "Clapperboard",
        "subcategories": [
            {"name": "Movies", "icon": "Clapperboard"},
            {"name": "Games", "icon": "Gamepad2"},
            {"name": "Streaming Services", "icon": "Tv"},
            {"name": "Events", "icon": "Ticket"},
            {"name": "Hobbies", "icon": "Palette"},
        ],
    },
    {
        "name": "Education",
        "icon": "GraduationCap",
        "subcategories": [
            {"name": "Tuition", "icon": "GraduationCap"},
            {"name": "Books", "icon": "BookOpen"},
            {"name": "Online Courses", "icon": "MonitorPlay"},
            {"name": "School Supplies", "icon": "PenLine"},
        ],
    },
    {
        "name": "Pet",
        "icon": "PawPrint",
        "subcategories": [
            {"name": "Pet Food", "icon": "Fish"},
            {"name": "Vet", "icon": "Stethoscope"},
            {"name": "Pet Supplies", "icon": "PawPrint"},
            {"name": "Grooming", "icon": "Scissors"},
            {"name": "Pet Services", "icon": "PawPrint"},
        ],
    },
    {
        "name": "Electronics",
        "icon": "Laptop",
        "subcategories": [
            {"name": "Computer", "icon": "Laptop"},
            {"name": "Phone", "icon": "Smartphone"},
            {"name": "Tablet", "icon": "Tablet"},
            {"name": "Accessories", "icon": "Cable"},
            {"name": "Software", "icon": "Code"},
        ],
    },
    {
        "name": "Sports",
        "icon": "Dumbbell",
        "subcategories": [
            {"name": "Gym", "icon": "Dumbbell"},
            {"name": "Sports Equipment", "icon": "Trophy"},
            {"name": "Sports Classes", "icon": "PersonStanding"},
            {"name": "Outdoor Activities", "icon": "MountainSnow"},
        ],
    },
    {
        "name": "Gifts & Donations",
        "icon": "Gift",
        "subcategories": [
            {"name": "Birthday Gift", "icon": "Cake"},
            {"name": "Holiday Gift", "icon": "Gift"},
            {"name": "Donation", "icon": "Heart"},
            {"name": "Charity", "icon": "HandHeart"},
        ],
    },
    {
        "name": "Red Envelope",
        "icon": "Mail",
        "subcategories": [
            {"name": "Family", "icon": "Users"},
            {"name": "Friends", "icon": "UserRound"},
            {"name": "Holiday", "icon": "PartyPopper"},
            {"name": "Other", "icon": "Mail"},
        ],
    },
    {
        "name": "Other",
        "icon": "CircleEllipsis",
        "subcategories": [
            {"name": "Uncategorized", "icon": "CircleHelp"},
            {"name": "Unknown", "icon": "CircleHelp"},
        ],
    },
    {
        "name": "Transfers",
        "icon": "ArrowLeftRight",
        "subcategories": [
            {"name": "Credit Card Payment", "icon": "CreditCard"},
            {"name": "Savings Transfer", "icon": "PiggyBank"},
            {"name": "Investment Transfer", "icon": "TrendingUp"},
            {"name": "Cash Withdrawal", "icon": "Banknote"},
            {"name": "Internal Transfer", "icon": "ArrowLeftRight"},
            {"name": "E-Transfer", "icon": "Send"},
        ],
    },
    {
        "name": "Income",
        "icon": "CircleDollarSign",
        "subcategories": [
            {"name": "Cashback", "icon": "CreditCard"},
            {"name": "Interest Income", "icon": "PiggyBank"},
            {"name": "Salary Income", "icon": "TrendingUp"},
            {"name": "Other Income", "icon": "Banknote"},
        ],
    },
]
