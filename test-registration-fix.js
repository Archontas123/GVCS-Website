#!/usr/bin/env node

console.log('🧪 Testing registration validation fixes...');

// Test the validation schemas
const { teamRegistrationSchema } = require(__dirname + '/backend/src/utils/validation.js');

const testData = {
  teamName: 'Team Alpha-Beta',
  contestCode: 'FU83XKD2', 
  password: 'password123',
  schoolName: 'MIT University',
  memberNames: ['John Smith', 'Jane O\'Connor', 'Bob Johnson-Williams']
};

const { error, value } = teamRegistrationSchema.validate(testData);

if (error) {
  console.log('❌ Validation failed:');
  error.details.forEach(detail => {
    console.log(`  - ${detail.message}`);
  });
} else {
  console.log('✅ Validation passed!');
  console.log('Validated data:', JSON.stringify(value, null, 2));
}

console.log('\n🧪 Testing edge cases...');

// Test with various names
const edgeCases = [
  { 
    name: 'Names with apostrophes',
    data: { ...testData, memberNames: ['John O\'Brien', 'Mary-Jane Watson'] }
  },
  {
    name: 'School with ampersand',
    data: { ...testData, schoolName: 'A&M University' }
  },
  {
    name: 'Team name with periods',
    data: { ...testData, teamName: 'Team C.S. Winners' }
  }
];

edgeCases.forEach(({ name, data }) => {
  const { error } = teamRegistrationSchema.validate(data);
  if (error) {
    console.log(`❌ ${name}: Failed`);
    error.details.forEach(detail => {
      console.log(`  - ${detail.message}`);
    });
  } else {
    console.log(`✅ ${name}: Passed`);
  }
});

console.log('\n🎉 Validation fix testing completed!');