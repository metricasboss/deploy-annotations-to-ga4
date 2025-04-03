const { google } = require('googleapis');
const analyticsadmin = google.analyticsadmin('v1alpha');

async function createDeployAnnotation() {
  try {
    // Service Account Authtentication
    const auth = new google.auth.GoogleAuth({
      credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
      scopes: ['https://www.googleapis.com/auth/analytics.edit']
    });

    const authClient = await auth.getClient();
    google.options({ auth: authClient });

    // Creating push details to main Github
    const commitSha = process.env.GITHUB_SHA;
    const repoName = process.env.GITHUB_REPOSITORY;
    const commitMsg = require('child_process').execSync('git log -1 --pretty=%B').toString().trim();
    
    // Current Date
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    
    // Creating Annotation
    const response = await analyticsadmin.properties.reportingDataAnnotations.create({
      parent: `properties/${process.env.GA4_PROPERTY_ID}`,
      requestBody: {
        title: `New deploy`,
        description: `Commit: ${commitSha.substring(0, 7)} - ${commitMsg} by ${process.env.GITHUB_ACTOR}`,
        color: "BLUE",
        annotationDate: {
          year: year,
          month: month,
          day: day
        }
      }
    });

    console.log('Annotation created successfully:', response.data);
  } catch (error) {
    console.error('Error creating annotation:', error);
    process.exit(1);
  }
}

createDeployAnnotation();