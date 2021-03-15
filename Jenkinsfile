pipeline {
    options() {
        disableConcurrentBuilds()
    }
    agent any
    environment {
        BUILDNR = "${env.BUILD_NUMBER}"
    }
    parameters {
        booleanParam(defaultValue: false, description: 'Skal prosjektet releases?', name: 'isRelease')
        string(name: "releaseVersion", defaultValue: "", description: "Hva er det nye versjonsnummeret?")
        string(name: "snapshotVersion", defaultValue: "", description: "Hva er den nye snapshotversjonen?")
    }

    stages {

        stage('Resolve version') {
            steps {
                script {
                    env.GIT_SHA = sh(returnStdout: true, script: 'git rev-parse HEAD').substring(0, 7)
                    env.WORKSPACE = pwd()
                    env.CURRENT_VERSION = readFile "${env.WORKSPACE}/version"
                }
            }
        }

        stage('Release: Set new release version') {
            when {
                expression { params.isRelease }
            }

            steps {
                script {
                    if (params.releaseVersion == null || params.releaseVersion == "" || params.snapshotVersion == null || params.snapshotVersion == "") {
                        currentBuild.result = 'ABORTED'
                        error("release and snapshot version must be set")
                    }

                    env.IMAGE_TAG = params.releaseVersion
                    env.CURRENT_VERSION = params.releaseVersion
                    currentBuild.description = "Release: ${params.releaseVersion}"
                }

                gitCheckout()
                writeFile(file: "${env.WORKSPACE}/version", text: params.releaseVersion);
                sh 'git add version'
                sh 'git commit -m "new release version"'
                sh "git tag -a ${params.releaseVersion} -m \"Releasing jenkins build ${env.BUILD_NUMBER}\""
                gitPush()
            }
        }

        stage('Snapshot: Set image tag') {
            when {
                expression { !params.isRelease }
            }

            steps {
                script {
                    env.IMAGE_TAG = env.CURRENT_VERSION.replace("SNAPSHOT", env.GIT_SHA)
                }
            }
        }

        stage('Deploy artifacts') {
            when {
                branch 'master'
            }

            parallel {
                stage('Push images') {
                    steps {
                        sh "echo hei ${env.IMAGE_TAG}"
                        script {
                            if (params.isRelease) {
                                docker.withRegistry('http://docker-local.artifactory.fiks.ks.no/', 'artifactory-token-based')
                                        {
                                            def customImage = docker.build("fiks-grafana:${env.IMAGE_TAG}")
                                            customImage.push()
                                            customImage.push('latest')
                                        }
                            } else {
                                docker.withRegistry('http://docker-local-snapshots.artifactory.fiks.ks.no/', 'artifactory-token-based')
                                        {
                                            def customImage = docker.build("fiks-grafana:${env.IMAGE_TAG}")
                                            customImage.push()
                                            customImage.push('latest')
                                        }
                            }

                        }


                    }
                }

                stage('Push helm chart') {
                    steps {
                        buildHelmChart("fiks-grafana", "${env.CURRENT_VERSION.replace("SNAPSHOT", env.GIT_SHA)}")
                    }
                }
            }
        }

        stage('Release: Set new snapshot version') {
            when {
                expression { params.isRelease }
            }

            steps {
                writeFile(file: "${env.WORKSPACE}/version", text: "${params.snapshotVersion}-SNAPSHOT");
                sh 'git add version'
                sh "git commit -m \"Setting new snapshot version to ${params.snapshotVersion}-SNAPSHOT\""
                gitPush()
            }
        }

        stage('Snapshot: Deploy to dev') {
            when {
                branch 'master'
                expression { !params.isRelease }
            }
            environment {
                HELMCHART_VERSION = env.CURRENT_VERSION.replace("SNAPSHOT", env.GIT_SHA)
            }
            steps {
                build job: 'deployToDev', parameters: [string(name: 'chartName', value: 'fiks-grafana'), string(name: 'version', value: HELMCHART_VERSION)], wait: true, propagate: true
            }
        }

    }
}
