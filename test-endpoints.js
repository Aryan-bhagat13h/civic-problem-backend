async function runTests() {
  const baseUrl = 'http://localhost:8000/api/v1'
  let cookie = ''
  
  const timestamp = Date.now()
  const testEmail = `test${timestamp}@example.com`
  const testUsername = `testuser${timestamp}`

  console.log("1. Testing User Registration...")
  const registerRes = await fetch(`${baseUrl}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullname: 'Test User',
      email: testEmail,
      username: testUsername,
      password: 'password123'
    })
  })
  const registerData = await registerRes.json()
  console.log(`Status: ${registerRes.status}`)
  console.log(registerData)

  console.log("\n2. Testing User Login...")
  const loginRes = await fetch(`${baseUrl}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'password123'
    })
  })
  const loginData = await loginRes.json()
  console.log(`Status: ${loginRes.status}`)
  console.log(loginData)

  // extract cookies
  const setCookie = loginRes.headers.get('set-cookie')
  if (setCookie) {
     // rudimentary cookie extraction
     const parts = setCookie.split(',').map(s => s.split(';')[0])
     cookie = parts.join('; ')
  }
  const token = loginData.data?.accessToken

  console.log("\n3. Testing Get My Issues (should be empty but succeed)...")
  const issuesRes = await fetch(`${baseUrl}/issues/mine`, {
    headers: { 
      'Cookie': cookie,
      'Authorization': `Bearer ${token}`
    }
  })
  const issuesData = await issuesRes.json()
  console.log(`Status: ${issuesRes.status}`)
  console.log(issuesData)

  console.log("\n4. Testing Logout...")
  const logoutRes = await fetch(`${baseUrl}/users/logout`, {
    method: 'POST',
    headers: { 
      'Cookie': cookie,
      'Authorization': `Bearer ${token}`
    }
  })
  const logoutData = await logoutRes.json()
  console.log(`Status: ${logoutRes.status}`)
  console.log(logoutData)
}

runTests().catch(console.error)
