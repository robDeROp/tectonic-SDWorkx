terraform {
  required_version = ">= 1.9, < 2.0"
  backend "gcs" {}
  required_providers {
    google = { source = "hashicorp/google", version = "~> 6.0" }
  }
}
variable "project_id" { type = string }
variable "region" { type = string }
variable "github_repository" { type = string }
variable "github_repository_id" { type = string }
variable "github_owner_id" { type = string }
provider "google" {
  project = var.project_id
  region  = var.region
}
resource "google_project_service" "apis" {
  for_each = toset([
    "artifactregistry.googleapis.com", "cloudbuild.googleapis.com", "iam.googleapis.com",
    "iamcredentials.googleapis.com", "sts.googleapis.com", "logging.googleapis.com",
    "run.googleapis.com", "cloudresourcemanager.googleapis.com"
  ])
  service            = each.key
  disable_on_destroy = false
}
resource "google_artifact_registry_repository" "images" {
  location      = var.region
  repository_id = "clarity"
  format        = "DOCKER"
  depends_on    = [google_project_service.apis]
}
resource "google_storage_bucket" "build_source" {
  name                        = "${var.project_id}-clarity-build-source"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  lifecycle_rule {
    condition { age = 7 }
    action { type = "Delete" }
  }
}
resource "google_service_account" "builder" {
  account_id   = "clarity-builder"
  display_name = "Clarity initial Cloud Build"
  depends_on   = [google_project_service.apis]
}
resource "google_service_account" "deployer" {
  account_id   = "clarity-deployer"
  display_name = "Clarity GitHub deployment"
  depends_on   = [google_project_service.apis]
}
resource "google_artifact_registry_repository_iam_member" "writers" {
  for_each   = { builder = google_service_account.builder.email, deployer = google_service_account.deployer.email }
  location   = var.region
  repository = google_artifact_registry_repository.images.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${each.value}"
}
resource "google_storage_bucket_iam_member" "source_reader" {
  bucket = google_storage_bucket.build_source.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.builder.email}"
}
resource "google_project_iam_member" "builder_logs" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.builder.email}"
}
resource "google_project_iam_member" "deploy" {
  project = var.project_id
  role    = "roles/run.developer"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "clarity-github"
  display_name              = "Clarity GitHub Actions"
  depends_on                = [google_project_service.apis]
}
resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  attribute_mapping = {
    "google.subject"                = "assertion.sub"
    "attribute.repository_id"       = "assertion.repository_id"
    "attribute.repository_owner_id" = "assertion.repository_owner_id"
  }
  attribute_condition = "assertion.repository_id == '${var.github_repository_id}' && assertion.repository_owner_id == '${var.github_owner_id}' && assertion.ref == 'refs/heads/main' && assertion.workflow_ref == '${var.github_repository}/.github/workflows/ci-cd.yml@refs/heads/main' && assertion.event_name in ['push', 'workflow_dispatch']"
  oidc { issuer_uri = "https://token.actions.githubusercontent.com" }
}
resource "google_service_account_iam_member" "github_deploy" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository_id/${var.github_repository_id}"
}
output "workload_identity_provider" { value = google_iam_workload_identity_pool_provider.github.name }
output "deployer_service_account" { value = google_service_account.deployer.email }
output "builder_service_account" { value = google_service_account.builder.email }
# Allows the deployment identity to mint its own audience-bound ID token for probes.
resource "google_service_account_iam_member" "deployer_token" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.deployer.email}"
}
