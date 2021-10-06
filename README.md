# Property Manager
When you deploy web assets to the Akamai network, you create rules that tell Akamai edge servers how to process end-user requests for your content. Akamai is always seeking ways to make managing complex configurations seamless and quick. With the **Property Manager** extension, you can edit and validate Property Manager API (PAPI) JSON rule trees the same way you interact with other parts of your infrastructure. Once you've updated and validated the configuration file, use [PAPI](https://learn.akamai.com/en-us/products/core_features/property_manager.html) or [Property Manager CLI](https://developer.akamai.com/cli/packages/property-manager.html) to push the updated file back to the Akamai platform.

## Features
- Editing rules, adding behaviors and criteria
- Integration with external, non-Property Manager resources such as CP codes or NetStorage groups
- Syntax highlighting
- Syntax autocomplete based on your Akamai product
- Inline JSON syntax checker
- Property Manager variables support
- Rule tree validation
- Error handling with links to code lines

## Before you begin
Before you use this extension, make sure you have access to [Akamai Control Center](https://control.akamai.com/) with the appropriate roles and permissions to create API clients and manage credentials. An API client contains authentication tokens that secure the interactions between your application and the Akamai platform. Contact an Akamai administrator within your company and ask them to create the API credentials for you if you don’t have either of these permissions in your role:
- IDM: API Clients – User Access
- IDM: API Clients – Admin Access

#### Create API credentials
With admin access to Akamai Control Center, you can configure your own tokens and client secrets.
1. Launch [Identity and Access Management](https://control.akamai.com/apps/identity-management/). In Akamai Control Center, click <span style="font-size:large;font-weight:bold">&Congruent;</span> &rArr; ACCOUNT ADMIN &rArr; Identity & access.
2. From the **Users and API Clients** tab, click **New API client for me** to open the *Customize API client* screen.
3. Follow one of the scenarios:
   - To instantly create an API client and credentials for the Akamai APIs you can access, click **Quick**. This client’s API access levels, group roles, and permissions are identical to yours. For details about roles, permissions, and access levels, see [Identity and Access Management](https://control.akamai.com/dl/IDM/IAM/index.html).
   - To make updates to one or more of the accounts you manage, click **Advanced**. In the *Details* section, select **Let this client manage multiple accounts** . For details, see [Manage multiple accounts with one API client](https://control.akamai.com/wh/CUSTOMER/AKAMAI/en-US/WEBHELP/identity-management/idm-help/GUID-D05CDFA1-CFCB-4D70-9CDD-F1933C27883F.html).

The client’s name, description, and notification list populate for you in the *Details* section. You can change this information at any time. The set of credentials that appears in the *Credentials* section includes the client token and client secret needed to authenticate the extension.

4. To check that you have `READ-WRITE` access to the Property Manager API:
   1. Under *Details*, click **Show additional details**.
   1. Scroll through the APIs for Property Manager.
   1. If the API isn’t listed, contact your account representative for assistance.
5. Click **Download**, then add the credentials to the `.edgerc` file.

#### Add credentials to the .edgerc file
Configure the EdgeGrid credential file that includes client tokens and client secrets for the Akamai accounts you manage. You’ll need this file to authenticate the connection between the extension and the Akamai platform.
1. Open the file you downloaded in a text editor.
2. Add a line above the credentials for your account as follows: `[default]`

	![edgerc_example](/media/edgerc_example.jpeg)

> **NOTE**: You can add other credentials to this file as needed. Separate each set of credentials with a `[header]` as shown in the example. Then, while setting up the authentication in VS Code, you can select the credentials you want to use for editing.

3. Save the file in your home directory with the name `.edgerc`

## Get started
1. Install the Property Manager extension by clicking the install link in the marketplace, or install it from the **Extensions** tab in Visual Studio Code.
2. In **Command Palette**, enter `Edit Rules`
3. When you run the extension for the first time, you need to set up your credentials:
   1. Upload the `.edgerc` file. For MacOS, press **Command+Shift+Dot** to show the hidden files.
   1. From the menu, select your EdgeGrid credentials that provide access to the properties you want to edit.
   1. **Optional:** If you created an API client that can manage multiple accounts, enter the **Account Switch Key**.
   1. Click **Submit**.

To start editing a JSON configuration file, you can either:
- **Download a rules file** from the platform. Enter an existing property name and look it up with a search button. Once confirmed, select a version and click **Download**.
- **Use a local rules file**. Open a local file in VS Code and in the extension tab, verify that the file path and property name populated correctly. Click **Edit**.

## Edit mode
With the Property Manager extension, you can manage rules, behaviors, criteria, and variables in your existing configurations.

Press **Control+Space** and the automatic completion prompts you with the building blocks available for your product and module. To learn more about how these elements work together, see [PAPI Catalog ](https://developer.akamai.com/api/core_features/property_manager/vlatest.html).

![autocompletebehavior](/media/autocompletebehavior.gif)

This feature also lists possible option values.

![gifcountry](/media/gifcountry.gif)

### External resources

In some behaviors, you need to specify information that comes from the Akamai applications other than Property Manager. Instead of running separate API or CLI calls to get that data, navigate to the option value and press **Control+Space**. This gets a list of external resources available for the property ID and version associated with your rule tree.

Supported external resources:

- Content Provider (CP) codes
- NetStorage groups for the `originServer` behavior
- AWS and GCS access keys for the `originCharacteristics` behavior
- Beacon data sources for the `adaptiveAcceleration` behavior
- Revocation lists for the `segmentedContentProtection` behavior
- EdgeWorker IDs
- Stream names for the `datastream` behavior
- JWT key locations for the `verifyJsonWebToken` behavior
- Locations for the `cloudWrapper` behavior
- Custom behavior IDs

## Validation
Make sure your JSON file is correct before deploying it on the Akamai platform. The validation returns a list of errors and warnings that point you directly to the lines of code you need to fix.

To validate your configuration:
1. Save the rules JSON file.
2. In **Command Palette**, enter `Validate Rules`. This opens a new file with a list of errors and warnings.
3. Right-click the `errorLocation` value and select **Go to Definition**. The result points you to the line of code that caused the problem.

![gifvalidated](/media/gifvalidated.gif)

To learn more about configuration errors and warnings, in the validation file, go to the link in the `type` value.

## Push the configuration back to the platform
After you’ve made your changes and validated the configuration, use [PAPI](https://learn.akamai.com/en-us/products/core_features/property_manager.html) or [Property Manager CLI](https://developer.akamai.com/cli/packages/property-manager.html) to push the updated file back to the Akamai platform.
