const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cXd2dXFlZW5rdXNkYXlvc3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODA3ODksImV4cCI6MjA4ODc1Njc4OX0.R0dNwSW9ibeU0XE9kYdKI3E2D6vEP6dVu2VATAHXK1A';
const base = 'https://gvqwvuqeenkusdayosty.supabase.co';
const email = 'hillarydark6@gmail.com';
const password = '12341234';

const login = await fetch(base + '/auth/v1/token?grant_type=password', {
  method: 'POST',
  headers: {
    apikey: anon,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email, password }),
});

const loginData = await login.json();
if (!login.ok) {
  throw new Error(JSON.stringify(loginData));
}

const response = await fetch(base + '/functions/v1/make-server-a1c55d7e/admin/platform-users', {
  headers: {
    apikey: anon,
    Authorization: `Bearer ${anon}`,
    'x-user-jwt': loginData.access_token,
  },
});

const text = await response.text();
console.log(JSON.stringify({ status: response.status, text }, null, 2));
