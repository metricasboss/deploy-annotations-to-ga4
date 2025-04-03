const jwt = require('jsonwebtoken');
const https = require('https');
const fs = require('fs');

async function createDeployAnnotation() {
  try {
    // Carregar as credenciais da conta de serviço
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    
    // Gerar token JWT
    const token = generateJWT(credentials);
    
    // Detalhes do push para main do GitHub
    const commitSha = process.env.GITHUB_SHA;
    const repoName = process.env.GITHUB_REPOSITORY;
    const commitMsg = require('child_process').execSync('git log -1 --pretty=%B').toString().trim();
    
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

    // URL da API
    const propertyId = process.env.GA4_PROPERTY_ID;
    const apiUrl = `https://analyticsadmin.googleapis.com/v1alpha/properties/${propertyId}/reportingDataAnnotations`;

    // Fazer requisição REST
    const response = await makeRequest(apiUrl, 'POST', token, annotationData);
    console.log('Annotation created successfully:', response);
  } catch (error) {
    console.error('Error creating annotation:', error);
    process.exit(1);
  }
}

// Gerar JWT para autenticação com a service account
function generateJWT(credentials) {
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
  const signedJwt = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
  
  // Obter token de acesso usando o JWT
  return getAccessToken(signedJwt);
}

// Obter token de acesso a partir do JWT
async function getAccessToken(signedJwt) {
  const tokenEndpoint = 'https://oauth2.googleapis.com/token';
  const data = {
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: signedJwt
  };
  
  const response = await makeRequest(tokenEndpoint, 'POST', null, data, 'application/x-www-form-urlencoded');
  return response.access_token;
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
    
    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(responseData));
          } catch (e) {
            resolve(responseData);
          }
        } else {
          reject(new Error(`Request failed with status code ${res.statusCode}: ${responseData}`));
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