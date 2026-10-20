variable "jev_model" {
  type    = string
  default = "jev-1.13.0"
}

# Provision/populate with scripts/sync-jev-secret.mjs before terraform apply.
# Key material stays out of Terraform configuration, plans and state.
data "google_secret_manager_secret" "jev" {
  secret_id = "clarity-jev-key"
}

resource "google_secret_manager_secret_iam_member" "app_jev" {
  secret_id = data.google_secret_manager_secret.jev.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.app.email}"
}
