# Seed Scripts

This directory contains scripts for seeding initial data into the database.

## Create Admin User

Creates an initial admin user for the system. This is useful for the first-time setup.

### Usage

**Default admin user:**
```bash
npm run seed:user
```

This will create an admin user with:
- Name: "Admin User"
- Email: "admin@muslimdaalmill.com"
- Password: "admin123"
- Role: Admin

**Custom admin user:**
```bash
node src/scripts/seedUser.js "Your Name" "your-email@example.com" "your-password"
```

### Example

```bash
npm run seed:user
# or
node src/scripts/seedUser.js "John Doe" "john@example.com" "SecurePass123"
```

### Notes

- The script will check if an admin user with the same email already exists
- If users exist in the database, it will still create the admin user
- Make sure to change the default password after first login
- The script requires MongoDB to be running and accessible

### Environment Variables

Make sure your `.env` file has the correct `MONGODB_URI` set before running the script.

