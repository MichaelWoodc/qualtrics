# CRA Task for Qualtrics

## Overview
The CRA Task (Compound Response Association Task) is designed to assess participants' ability to generate a word that connects to a set of three stimulus words. This project integrates the CRA Task into Qualtrics, allowing researchers to collect data efficiently within their surveys.

## Project Structure
The project consists of the following files:

- **src/cra_task.js**: Contains the main JavaScript code for the CRA task, including initialization of the jsPsych library, loading problems from a JSON file, managing the experiment timeline, and handling user interactions and data collection.

- **src/qualtrics.js**: Integrates the CRA task with Qualtrics. This file includes functions to load the CRA task and manage any specific Qualtrics API interactions necessary for embedding the task within a Qualtrics survey.

- **src/cra_problems.json**: Contains the problems used in the CRA task. It is structured as a JSON object with an array of problems, each containing words, solutions, and regex patterns for validation.

- **index.html**: Serves as the entry point for the project. It includes references to the `cra_task.js` and `qualtrics.js` files, as well as the necessary HTML structure to display the CRA task within a Qualtrics survey.

## Setup Instructions
1. **Download the Project**: Clone or download the repository containing the CRA Task files.

2. **Integrate with Qualtrics**:
   - Upload the `src/cra_problems.json`, `src/cra_task.js`, and `src/qualtrics.js` files to your Qualtrics survey.
   - Reference these files in the `index.html` file to ensure they are loaded correctly.

3. **Modify Qualtrics Survey**:
   - Embed the CRA Task by including the `index.html` file in your Qualtrics survey using the "Add JavaScript" option in the survey editor.

## Usage Guidelines
- Ensure that the `cra_problems.json` file is correctly formatted and contains the necessary problems for the task.
- Customize the `qualtrics.js` file as needed to handle any specific Qualtrics API interactions or data collection requirements.
- Test the integration thoroughly to ensure that the CRA Task functions as expected within the Qualtrics environment.

## License
This project is licensed under the MIT License. Please see the LICENSE file for more details.

## Acknowledgments
Special thanks to the jsPsych library for providing the framework for conducting psychological experiments online.