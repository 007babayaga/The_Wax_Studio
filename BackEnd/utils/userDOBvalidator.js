const validateDateOfBirth = (dob) => {
    // Check if DOB is provided
    if (!dob) {
        return { isValid: false, message: "Date of birth is required" };
    }

    // Convert to Date object
    const birthDate = new Date(dob);
    const today = new Date();

    // Check if valid date
    if (isNaN(birthDate.getTime())) {
        return { isValid: false, message: "Invalid date format" };
    }

    // Check if date is not in the future
    if (birthDate > today) {
        return { isValid: false, message: "Date of birth cannot be in the future" };
    }

    // Calculate age
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // Adjust age if birthday hasn't occurred this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    // Check minimum age (e.g., 13 years old)
    if (age < 13) {
        return { isValid: false, message: "You must be at least 13 years old" };
    }

    // Check maximum age (e.g., 120 years old - reasonable limit)
    if (age > 120) {
        return { isValid: false, message: "Invalid date of birth" };
    }

    return { isValid: true, age };
};

module.exports={validateDateOfBirth}