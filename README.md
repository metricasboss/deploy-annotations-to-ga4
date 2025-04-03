# Deploy Annotations to GA4

This repository contains an integration that automatically creates annotations in Google Analytics 4 (GA4) whenever a push to the main branch occurs. This allows you to correlate code changes with variations in performance metrics.

## 📋 About

This tool uses GitHub Actions to detect pushes to the main branch and then creates an annotation in Google Analytics 4 using the annotations API. Each annotation includes:

- Repository name
- Commit hash
- Commit message
- Deploy date

## 📊 Why use it?

- **For marketing and analytics teams**: Visualize exactly when site changes occurred and correlate them with metric changes
- **For developers**: Create an automatic record of implementations without manual effort
- **For managers**: Get a unified view of the development cycle and its impact on performance

## 🚀 How to use

### Prerequisites

- A GitHub repository
- A Google Analytics 4 property
- A Google Cloud service account with permissions for the Analytics Admin API

### Setup

1. **Create a service account in Google Cloud**:
   - Access the [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to "IAM & Admin" > "Service Accounts"
   - Create a service account with "Analytics Admin" permissions
   - Download the service account's JSON key

2. **Add the service account to GA4**:
   - In GA4, go to Admin > Property > Access Management
   - Add the service account email with Editor permission

3. **Configure secrets in GitHub**:
   - In your repository, go to Settings > Secrets and variables > Actions
   - Add two secrets:
     - `GOOGLE_APPLICATION_CREDENTIALS_JSON`: The content of the service account JSON file
     - `GA4_PROPERTY_ID`: Your GA4 property ID

4. **Copy the files from this repository**:
   - Copy the `.github` folder to your repository
   - Make sure the files are in the correct structure:
     - `.github/workflows/ga-annotations.yml`
     - `.github/scripts/create-annotation.js`

5. **Commit and push to the main branch**:
   ```bash
   git add .github
   git commit -m "Add GA4 annotations integration"
   git push origin main
   ```

6. **Verify**:
   - Access the "Actions" tab in your repository to confirm that the workflow ran successfully
   - Check Google Analytics 4 to see if the annotation was created

## 🔧 Project Structure

- `.github/workflows/ga-annotations.yml` - GitHub Actions configuration
- `.github/scripts/create-annotation.js` - Script to create annotations in GA4

## 📈 Viewing Annotations in GA4

To view the created annotations:
1. Access Google Analytics 4
2. Navigate to reports that show data over time
3. Annotations will appear as markers on the charts
4. Hover over the markers to see the deploy details

## 🛠️ Technologies Used

- GitHub Actions
- Node.js
- Google Analytics Admin API v1alpha
- OAuth 2.0 Authentication via JWT

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 🔗 Useful Links

- [GA4 Annotations API](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/properties.reportingDataAnnotations)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Google Cloud Authentication](https://cloud.google.com/docs/authentication)

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

---

Developed by [Métricas Boss](https://metricasboss.com.br)
