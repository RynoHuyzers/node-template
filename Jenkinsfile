pipeline {
    agent {
        label 'main'
    }

    environment {
        AWS_DEFAULT_REGION="${params.AWSRegion}"
        sonarqubeScannerHome = tool 'SonarQube Scanner 3.2.0.1227'
    }

    parameters {
        string(name: 'AppName', defaultValue: 'Node-Template')
        string(name: 'DeployBucket', defaultValue: '')
        string(name: 'ProjectName', defaultValue: 'Microservice-Node-Template')

        string(name: 'AWSRegion', defaultValue: 'eu-west-1', description: 'AWS Region')

        string(name: 'DevAWSAccountNumber', defaultValue: '', description: 'AWS Account Number - Development')
        string(name: 'DevAWSCredentialsId', defaultValue: '', description: 'AWS Credentials added to Jenkins')

        string(name: 'QaAWSAccountNumber', defaultValue: '', description: 'AWS Account Number')
        string(name: 'QaAWSCredentialsId', defaultValue: '', description: 'AWS Credentials added to Jenkins')

        string(name: 'ProdAWSAccountNumber', defaultValue: '', description: 'AWS Account Number')
        string(name: 'ProdAWSCredentialsId', defaultValue: '', description: 'AWS Credentials added to Jenkins')
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '4', artifactNumToKeepStr: '1'))
    }

    stages {
        stage('Env Setup') {

            steps {

                script{
                    switch(env.Branch_Name){
                    case 'development':
                        env.DEPLOYMENT_ENVIRONMENT = "Dev";
                        env.AWSAccountNumber="${params.DevAWSAccountNumber}"
                        env.AWSCredentialId = "${params.DevAWSCredentialsId}";
                        break;

                    case ~/^release\/.*/:
                        env.DEPLOYMENT_ENVIRONMENT = "QA";
                        env.AWSAccountNumber="${params.QaAWSAccountNumber}"
                        env.AWSCredentialId = "${params.QaAWSCredentialsId}";
			            break;

                    case ~/^hotfix\/.*/:
                        env.DEPLOYMENT_ENVIRONMENT = "QA";
                        env.AWSAccountNumber="${params.QaAWSAccountNumber}"
                        env.AWSCredentialId = "${params.QaAWSCredentialsId}";
			            break;

                    case 'master':
                        env.DEPLOYMENT_ENVIRONMENT = "Prod";
                        env.AWSAccountNumber="${params.ProdAWSAccountNumber}"
                        env.AWSCredentialId = "${params.ProdAWSCredentialsId}";
                       break;

                    default:
                        env.DEPLOYMENT_ENVIRONMENT = 'no_deploy';

                    }
                    env.EnvLowerCase = "${env.DEPLOYMENT_ENVIRONMENT.toLowerCase()}";
                    env.DeploymentBucket = "${params.DeployBucket}";

                    env.AWS_DEFAULT_REGION = "${params.AWSRegion}";

                    sh """
                        ## Printout version numbers in build console
                        node --version
                        aws --version
                        cdk --version
                        printenv
                    """
                }
                script{
                    sh """
                        #Whack so install-peers does it's thing
                        rimraf node_modules
                        npm rebuild
                        npm install

                        echo "Clean and Setup Deploy Directories"
                        npm run clean

                    """
                }
            }
        }

        stage('Build NestJS Lambda Layer') {
            // perform this stage only when a change has been detected in the Jenksinfile, or anything related to layer dependencies
            when {
                anyOf {
                    changeset pattern: "Jenkinsfile", caseSensitive: true;
                    changeset pattern: "nest-layer/package.json", caseSensitive: true;
                    changeset pattern: "cdk/nest-layer/**/*.ts", caseSensitive: true;
                }
            }
            steps {
                nodejs(nodeJSInstallationName: 'NodeJS 12.14.1') {
                    sh """
                        ## downloads all dependencies, creates a directory called nodejs, copies dependencies into it, zips the directory.
                        npm run nest-layer:build
                    """
                }
            }
        }

        stage('Build RestAPI') {
            // perform this stage only when a change has been detected in the Jenksinfile, or anything related to the code
            when {
                anyOf {
                    changeset pattern: "Jenkinsfile", caseSensitive: true;
                    changeset pattern: "rest-api/tsconfig.build.json", caseSensitive: true;
                    changeset pattern: "rest-api/src/**/*.ts", caseSensitive: true;
                    changeset pattern: "cdk/rest-api/**/*.ts", caseSensitive: true;
                    changeset pattern: "cdk/rest-api/**/*.yaml", caseSensitive: true;
                }
            }
            steps {
                nodejs(nodeJSInstallationName: 'NodeJS 12.14.1') {
                    sh """

                        ## cd into correct directory, and nest build lambda code
                        npm run rest-api:build

                        # Deployable Zip
                        npm prune --production
                        npx mkdirp deploy/rest-api
                        cd build/rest-api
                        ## zip all build artifact from rest-api:build
                        zip -r9 ../../deploy/rest-api/client-management-rest-lambda.zip *
                        cd ../..
                        ## zip node modules into zip file
                        zip -r9 deploy/rest-api/client-management-rest-lambda.zip node_modules/
                        rm -rf node_modules

                    """
                }
            }
        }

        stage('Prepare Deploy Dependencies') {
            // Basically always perform this step if there was change to any code or dependnecy
            when {
                anyOf {
                    changeset pattern: "Jenkinsfile", caseSensitive: true;
                    changeset pattern: "nest-layer/package.json", caseSensitive: true;
                    changeset pattern: "cdk/**/*.*", caseSensitive: true;
                    changeset pattern: "rest-api/**/*.ts", caseSensitive: true;
                }
            }
            steps {
                script{
                    sh """
                        echo "Install CDK Dependencies"
                        npm install --only=dev
                    """
                }
            }
        }

        stage('Deploy Nest Layer') {
            // perform this stage only for dev, QA or Prod, when there are changes to the Jenkinsfile, or anything related to dependencies
            when {
                allOf {
                    not { environment name: 'DEPLOYMENT_ENVIRONMENT', value: 'no_deploy'};
                    anyOf {
                        changeset pattern: "Jenkinsfile", caseSensitive: true;
                        changeset pattern: "nest-layer/package.json", caseSensitive: true;
                        changeset pattern: "cdk/nest-layer/**/*.ts", caseSensitive: true;
                    }
                }
            }
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding',
                                    credentialsId: "${env.AWSCredentialId}",
                                    accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                                    secretKeyVariable: 'AWS_SECRET_ACCESS_KEY']]) {
                    sh """
                        echo "Deploy Nest Layer"
                        ## cd into cdk directory and compiles cdk
                        npm run cdk:build:nest-layer

                        cd cdk/src/nest-layer
                        npx rimraf cdk.out

                        ## Deploys zip file created during cdk compile
                        npm run cdk:deploy:nest-layer -- --require-approval=never
                    """
                }
            }
        }

        stage('Deploy REST API Proxy Lambda') {
            // perform this stage only for dev, QA or Prod, when there are changes to the Jenkinsfile, or anything related to lambda code or cdk
            when {
                allOf {
                    not { environment name: 'DEPLOYMENT_ENVIRONMENT', value: 'no_deploy'};
                    anyOf {
                        changeset pattern: "Jenkinsfile", caseSensitive: true;
                        changeset pattern: "rest-api/src/**/*.ts", caseSensitive: true;
                        changeset pattern: "cdk/rest-api/proxy-lambda/**/*.ts", caseSensitive: true;
                    }
                }
            }
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding',
                                    credentialsId: "${env.AWSCredentialId}",
                                    accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                                    secretKeyVariable: 'AWS_SECRET_ACCESS_KEY']]) {
                    sh """
                        echo "Deploy REST API Proxy Lambda"
                        ## cd into cdk directory and compiles cdk
                        npm run cdk:build:rest-api-proxy

                        cd cdk/rest-api/proxy-lambda
                        npx rimraf cdk.out

                        ## Deploys zip file created during cdk compile
                        npm run cdk:deploy:rest-api-proxy -- --require-approval=never
                    """
                }
            }
        }

        stage('Deploy REST API Gateway') {
            // perform this stage only for dev, QA or Prod, when there are changes to the Jenkinsfile, or anything related the cdk of the api gateway
            when {
                allOf {
                    not { environment name: 'DEPLOYMENT_ENVIRONMENT', value: 'no_deploy'};
                    anyOf {
                        changeset pattern: "Jenkinsfile", caseSensitive: true;
                        changeset pattern: "cdk/rest-api/gateway/**/*.ts", caseSensitive: true;
                        changeset pattern: "cdk/rest-api/gateway/**/*.yaml", caseSensitive: true;
                    }
                }
            }
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding',
                                    credentialsId: "${env.AWSCredentialId}",
                                    accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                                    secretKeyVariable: 'AWS_SECRET_ACCESS_KEY']]) {
                    sh """
                        echo "Deploy REST API Gateway"

                        # Combine openapi spec into a single file and generate API Documentation
                        npm run rest-api:doc

                        # Substitute variables for deployment
                        npx mkdirp deploy/rest-api
                        npx envsub --protect \
                        --env AWSRegion=${params.AWSRegion} --env AWSAccountNumber=${env.AWSAccountNumber} \
                        dist/rest-api/openapi/clients-api.yaml deploy/rest-api/clients-api.yaml

                        # Rename documentation file
                        npx ncp ./redoc-static.html ./deploy/rest-api/index.html


                        # Deploy gateway
                        npm run cdk:build:rest-api-gw

                        cd cdk/src/rest-api/gateway
                        npx rimraf cdk.out

                        npm run cdk:deploy:rest-api-gw -- --require-approval=never

                    """
                }
            }
        }


        stage('Deploy DynamoDB') {
            when {
                allOf {
                    not { environment name: 'DEPLOYMENT_ENVIRONMENT', value: 'no_deploy'};
                    anyOf {
                        changeset pattern: "Jenkinsfile", caseSensitive: true;
                        changeset pattern: "cdk/dynamo-db/**/*.ts", caseSensitive: true;
                    }
                }
            }
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding',
                                    credentialsId: "${env.AWSCredentialId}",
                                    accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                                    secretKeyVariable: 'AWS_SECRET_ACCESS_KEY']]) {
                    sh """
                        echo "Deploy Nest Layer"
                        ## cd into cdk directory and compiles cdk
                        npm run cdk:build:dynamodb

                        cd cdk/dynamo-db
                        npx rimraf cdk.out

                        ## Deploys zip file created during cdk compile
                        npm run cdk:deploy:dynamodb -- --require-approval=never
                    """
                }
            }
        }
    }
}

def getParameterValue(String paramName) {

  sh (
    script: "aws --output json ssm get-parameter --name \"${paramName}\" | jq \'.Parameter.Value\'",
    returnStdout: true
    ).trim();
}
