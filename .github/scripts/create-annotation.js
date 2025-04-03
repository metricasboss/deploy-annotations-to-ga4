const jwt = require('jsonwebtoken');
const https = require('https');

async function createDeployAnnotation() {
  try {
    // Carregar as credenciais da conta de serviço
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    console.log("Loaded credentials for service account:", credentials.client_email);
    
    // Gerar token JWT e obter token de acesso
    console.log("Generating JWT token...");
    const token = await getAccessToken(credentials);
    console.log("Access token obtained successfully");
    
    // Detalhes do push para main do GitHub
    const commitSha = process.env.GITHUB_SHA || "unknown-sha";
    const repoName = process.env.GITHUB_REPOSITORY || "unknown-repo";
    let commitMsg = "No commit message";
    try {
      commitMsg = require('child_process').execSync('git log -1 --pretty=%B').toString().trim();
    } catch (e) {
      console.log("Could not get commit message:", e.message);
    }
    
    // Data atual
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    
    // Dados da anotação
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

    console.log("Annotation data:", JSON.stringify(annotationData));

    // URL da API
    const propertyId = process.env.GA4_PROPERTY_ID;
    console.log("Using GA4 Property ID:", propertyId);
    
    const apiUrl = `https://analyticsadmin.googleapis.com/v1alpha/properties/${propertyId}/reportingDataAnnotations`;
    console.log("API URL:", apiUrl);

    // Fazer requisição REST
    console.log("Sending request to create annotation...");
    const response = await makeRequest(apiUrl, 'POST', token, annotationData);
    console.log('Annotation created successfully:', response);
  } catch (error) {
    console.error('Error creating annotation:', error);
    if (error.response) {
      console.error('Response details:', error.response);
    }
    process.exit(1);
  }
}

// Obter token de acesso a partir das credenciais
async function getAccessToken(credentials) {
  try {
    // Gerar JWT
    const now = Math.floor(Date.now() / 1000);
    
    const payload = {
      iss: credentials.client_email,
      sub: credentials.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600, // Token expira em 1 hora
      scope: 'https://www.googleapis.com/auth/analytics.edit'
    };
    
    const privateKey = credentials.private_key;
    
    // Gerar token assinado
    console.log("Signing JWT with RS256 algorithm...");
    const signedJwt = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
    
    // Obter token de acesso usando o JWT
    console.log("Exchanging JWT for access token...");
    const tokenEndpoint = 'https://oauth2.googleapis.com/token';
    const data = {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signedJwt
    };
    
    const response = await makeRequest(tokenEndpoint, 'POST', null, data, 'application/x-www-form-urlencoded');
    console.log("Token exchange response received");
    
    if (!response.access_token) {
      throw new Error("No access token received: " + JSON.stringify(response));
    }
    
    return response.access_token;
  } catch (error) {
    console.error("Error generating access token:", error);
    throw error;
  }
}

// Função auxiliar para fazer requisições REST
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
    
    console.log(`Making ${method} request to ${url}...`);
    
    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`Received response with status code: ${res.statusCode}`);
        
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
      console.error("Request error:", error.message);
      reject(error);
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

createDeployAnnotation();