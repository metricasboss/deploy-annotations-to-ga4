const jwt = require('jsonwebtoken');
const https = require('https');

async function createDeployAnnotation() {
  try {
    // Load service account credentials
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    
    // Generate JWT token and obtain access token
    const token = await getAccessToken(credentials);
    
    // GitHub push details
    const commitSha = process.env.GITHUB_SHA || "unknown-sha";
    const repoName = process.env.GITHUB_REPOSITORY || "unknown-repo";
    let commitMsg = "No commit message";
    try {
      commitMsg = require('child_process').execSync('git log -1 --pretty=%B').toString().trim();
    } catch (e) {}

    // Current date
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    
    // Annotation data
    const annotationData = {
      title: `Deploy: ${repoName}`,
      description: `Commit: ${commitSha.substring(0, 7)} - ${commitMsg}`,
      color: "BLUE",
      annotationDate: {
        year: year,
        month: month,
        day: day
      }
    };

    // API URL
    const propertyId = process.env.GA4_PROPERTY_ID;
    const apiUrl = `https://analyticsadmin.googleapis.com/v1alpha/properties/${propertyId}/reportingDataAnnotations`;

    // Send REST request
    const response = await makeRequest(apiUrl, 'POST', token, annotationData);
  } catch (error) {
    if (error.response) {
      console.error('Response details:', error.response);
    }
    process.exit(1);
  }
}

// Obtain access token from credentials
async function getAccessToken(credentials) {
  try {
    // Generate JWT
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: credentials.client_email,
      sub: credentials.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600, // Token expires in 1 hour
      scope: 'https://www.googleapis.com/auth/analytics.edit'
    };
    const privateKey = credentials.private_key;
    const signedJwt = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

    // Exchange JWT for access token
    const tokenEndpoint = 'https://oauth2.googleapis.com/token';
    const data = {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signedJwt
    };
    const response = await makeRequest(tokenEndpoint, 'POST', null, data, 'application/x-www-form-urlencoded');
    if (!response.access_token) {
      throw new Error("No access token received: " + JSON.stringify(response));
    }
    return response.access_token;
  } catch (error) {
    throw error;
  }
}

// Helper function to make REST requests
function makeRequest(url, method, token, data, contentType = 'application/json') {
  return new Promise((resolve, reject) => {
    const options = {
      method: method,
      headers: {
        'Content-Type': contentType
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    let postData;
    if (contentType === 'application/json') {
      postData = JSON.stringify(data);
    } else if (contentType === 'application/x-www-form-urlencoded') {
      postData = new URLSearchParams(data).toString();
    }
    const req = https.request(url, options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsedData = JSON.parse(responseData);
            resolve(parsedData);
          } catch (e) {
            resolve(responseData);
          }
        } else {
          const error = new Error(`Request failed with status code ${res.statusCode}: ${responseData}`);
          error.response = responseData;
          reject(error);
        }
      });
    });
    req.on('error', (error) => {
      reject(error);
    });
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

createDeployAnnotation();
