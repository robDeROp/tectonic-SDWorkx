resource "google_service_account_iam_member" "deployer_runtime" {
  service_account_id = google_service_account.app.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.deployer_service_account}"
}
resource "google_cloud_run_v2_service_iam_member" "deployer_probe" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.app.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${var.deployer_service_account}"
}
resource "google_cloud_run_v2_job_iam_member" "deployer_migrate" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_job.migrate.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${var.deployer_service_account}"
}
