terraform {

  required_version = ">= 1.9, < 2.0"
  backend "gcs" {}
  required_providers {

    google = {
      source = "hashicorp/google", version = "~> 6.0"
    }

    random = {
      source = "hashicorp/random", version = "~> 3.0"
    }


  }


}

variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "europe-west1"

}

variable "gemini_model" {
  type = string
}

variable "deployer_service_account" {
  type = string
}

variable "app_image" {
  type = string
}

variable "tools_image" {
  type = string
}

variable "viewer_members" {

  type        = set(string)
  description = "IAM identities allowed to view the private demo, e.g. user:name@example.com"
  default     = []

}

provider "google" {
  project = var.project_id
  region  = var.region

}

data "google_project" "current" {

}

locals {

  app_origin = "https://clarity-${data.google_project.current.number}.${var.region}.run.app"
  env = {

    GOOGLE_CLOUD_PROJECT        = var.project_id
    GOOGLE_CLOUD_LOCATION       = var.region
    GEMINI_MODEL                = var.gemini_model
    TASK_BACKEND                = "cloud-tasks"
    STORAGE_BACKEND             = "gcs"
    GCS_BUCKET                  = google_storage_bucket.documents.name
    CLOUD_TASKS_LOCATION        = var.region
    CLOUD_TASKS_QUEUE           = google_cloud_tasks_queue.reviews.name
    CLOUD_TASKS_SERVICE_ACCOUNT = google_service_account.tasks.email
    APP_URL                     = local.app_origin

  }


}

resource "google_project_service" "apis" {

  for_each           = toset(["run.googleapis.com", "sqladmin.googleapis.com", "aiplatform.googleapis.com", "cloudtasks.googleapis.com", "secretmanager.googleapis.com", "storage.googleapis.com"])
  service            = each.key
  disable_on_destroy = false

}

resource "google_service_account" "app" {
  account_id   = "clarity-app"
  display_name = "Clarity application"

}

resource "google_service_account" "tasks" {
  account_id   = "clarity-tasks"
  display_name = "Clarity authenticated task invoker"

}

resource "google_project_iam_member" "app_roles" {

  for_each = toset(["roles/aiplatform.user", "roles/cloudsql.client", "roles/cloudtasks.enqueuer"])
  project  = var.project_id
  role     = each.key
  member   = "serviceAccount:${google_service_account.app.email}"

}

resource "google_service_account_iam_member" "enqueue_identity" {

  service_account_id = google_service_account.tasks.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.app.email}"

}

resource "google_service_account_iam_member" "tasks_tokens" {

  service_account_id = google_service_account.tasks.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-cloudtasks.iam.gserviceaccount.com"
  depends_on         = [google_cloud_tasks_queue.reviews]

}

resource "google_sql_database_instance" "db" {

  name                = "clarity-postgres"
  region              = var.region
  database_version    = "POSTGRES_16"
  deletion_protection = true
  settings {

    tier                        = "db-f1-micro"
    edition                     = "ENTERPRISE"
    availability_type           = "ZONAL"
    deletion_protection_enabled = true
    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
    }

    ip_configuration {
      ipv4_enabled = true
    }


  }

  depends_on = [google_project_service.apis]

}

resource "google_sql_database" "db" {
  name     = "ticket_studio"
  instance = google_sql_database_instance.db.name

}

resource "random_password" "db" {
  length  = 32
  special = false

}

resource "google_sql_user" "app" {
  name     = "clarity"
  instance = google_sql_database_instance.db.name
  password = random_password.db.result

}

resource "google_secret_manager_secret" "database_url" {

  secret_id = "clarity-database-url"
  replication {
    auto {

    }

  }

  depends_on = [google_project_service.apis]

}

resource "google_secret_manager_secret_version" "database_url" {

  secret      = google_secret_manager_secret.database_url.id
  secret_data = "postgresql://clarity:${random_password.db.result}@localhost/ticket_studio?host=/cloudsql/${google_sql_database_instance.db.connection_name}"

}

resource "google_secret_manager_secret_iam_member" "app_secret" {

  secret_id = google_secret_manager_secret.database_url.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.app.email}"

}

resource "google_storage_bucket" "documents" {

  name                        = "${var.project_id}-clarity-documents"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false

}

resource "google_storage_bucket_iam_member" "app_documents" {

  bucket = google_storage_bucket.documents.name
  role   = "roles/storage.objectUser"
  member = "serviceAccount:${google_service_account.app.email}"

}

resource "google_cloud_tasks_queue" "reviews" {

  name     = "ticket-reviews"
  location = var.region
  rate_limits {
    max_concurrent_dispatches = 5
    max_dispatches_per_second = 5

  }

  retry_config {
    max_attempts = 5
    min_backoff  = "10s"
    max_backoff  = "120s"

  }

  depends_on = [google_project_service.apis]

}

resource "google_cloud_run_v2_service" "app" {

  name                = "clarity"
  location            = var.region
  deletion_protection = false
  template {

    service_account                  = google_service_account.app.email
    timeout                          = "300s"
    max_instance_request_concurrency = 20
    scaling {
      min_instance_count = 0
      max_instance_count = 3

    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.db.connection_name]
      }


    }

    containers {

      image = var.app_image
      resources {
        limits = {
          cpu = "1", memory = "1Gi"
        }

      }

      ports {
        container_port = 8080
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"

      }

      dynamic "env" {
        for_each = local.env
        content {
          name  = env.key
          value = env.value

        }


      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"

          }

        }


      }


    }


  }

  # CI/CD owns releases; applying infrastructure must not roll images back.
  lifecycle {
    ignore_changes = [template[0].containers[0].image, template[0].revision, traffic, client, client_version]
  }
  depends_on = [google_project_service.apis, google_secret_manager_secret_version.database_url, google_secret_manager_secret_iam_member.app_secret, google_project_iam_member.app_roles]

}

resource "google_cloud_run_v2_service_iam_member" "task_invoker" {

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.app.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.tasks.email}"

}

resource "google_cloud_run_v2_service_iam_member" "viewers" {

  for_each = var.viewer_members
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.app.name
  role     = "roles/run.invoker"
  member   = each.key

}

resource "google_cloud_run_v2_job" "migrate" {

  name                = "clarity-migrate"
  location            = var.region
  deletion_protection = false
  template {
    template {

      service_account = google_service_account.app.email
      max_retries     = 0
      timeout         = "600s"
      volumes {
        name = "cloudsql"
        cloud_sql_instance {
          instances = [google_sql_database_instance.db.connection_name]
        }


      }

      containers {

        image   = var.tools_image
        command = ["sh", "-c"]
        args    = ["npm run db:migrate && npm run db:seed"]
        volume_mounts {
          name       = "cloudsql"
          mount_path = "/cloudsql"

        }

        env {
          name = "DATABASE_URL"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.database_url.secret_id
              version = "latest"

            }

          }


        }


      }


    }

  }

  lifecycle {
    ignore_changes = [template[0].template[0].containers[0].image, client, client_version]
  }

  depends_on = [google_project_service.apis, google_secret_manager_secret_version.database_url, google_secret_manager_secret_iam_member.app_secret, google_project_iam_member.app_roles]

}

output "url" {
  value = local.app_origin
}
