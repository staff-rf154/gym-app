# API — актуальная спецификация

Сгенерировано из работающего backend (`GET /api/docs-json`) 2026-11-15;
пути домена `reception` переименованы в `administrator` в задании 039 (2026-11-16).
Формат: OpenAPI. Базовый префикс — `/api/v1`; авторизация — Bearer JWT.
При расхождении приоритет имеет `docs/TZ.md`.

```json
{
  "openapi": "3.0.0",
  "paths": {
    "/api/v1/health": {
      "get": {
        "operationId": "HealthController_check",
        "parameters": [],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "summary": "Проверка работоспособности",
        "tags": [
          "system"
        ]
      }
    },
    "/api/v1/admin/upload": {
      "post": {
        "operationId": "UploadController_upload",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "required": [
                  "file"
                ],
                "properties": {
                  "file": {
                    "type": "string",
                    "format": "binary"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Загрузить фото",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/auth/login": {
      "post": {
        "operationId": "AuthController_login",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/LoginDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "summary": "Вход по телефону и паролю",
        "tags": [
          "auth"
        ]
      }
    },
    "/api/v1/auth/refresh": {
      "post": {
        "operationId": "AuthController_refresh",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RefreshDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "summary": "Обновление токенов (rotation)",
        "tags": [
          "auth"
        ]
      }
    },
    "/api/v1/auth/logout": {
      "post": {
        "operationId": "AuthController_logout",
        "parameters": [],
        "responses": {
          "204": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Выход и отзыв refresh-токенов",
        "tags": [
          "auth"
        ]
      }
    },
    "/api/v1/auth/change-password": {
      "post": {
        "operationId": "AuthController_changePassword",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ChangePasswordDto"
              }
            }
          }
        },
        "responses": {
          "204": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Сменить свой пароль",
        "tags": [
          "auth"
        ]
      }
    },
    "/api/v1/auth/me": {
      "get": {
        "operationId": "AuthController_getMe",
        "parameters": [],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Текущий пользователь",
        "tags": [
          "auth"
        ]
      }
    },
    "/api/v1/auth/timezone": {
      "patch": {
        "operationId": "AuthController_updateTimezone",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateTimezoneDto"
              }
            }
          }
        },
        "responses": {
          "204": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Обновить часовой пояс",
        "tags": [
          "auth"
        ]
      }
    },
    "/api/v1/auth/push-token": {
      "patch": {
        "operationId": "AuthController_updatePushToken",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdatePushTokenDto"
              }
            }
          }
        },
        "responses": {
          "204": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Обновить FCM-токен устройства",
        "tags": [
          "auth"
        ]
      }
    },
    "/api/v1/admin/gyms": {
      "get": {
        "operationId": "GymsController_findAll",
        "parameters": [],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Список залов",
        "tags": [
          "admin"
        ]
      },
      "post": {
        "operationId": "GymsController_create",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateGymDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Создать зал",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/admin/gyms/{id}": {
      "get": {
        "operationId": "GymsController_findOne",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Зал по id",
        "tags": [
          "admin"
        ]
      },
      "put": {
        "operationId": "GymsController_update",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateGymDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Обновить зал",
        "tags": [
          "admin"
        ]
      },
      "delete": {
        "operationId": "GymsController_remove",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Удалить зал",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/gyms": {
      "get": {
        "operationId": "SharedGymsController_findAll",
        "parameters": [],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Список залов (любая роль)",
        "tags": [
          "shared"
        ]
      }
    },
    "/api/v1/admin/trainers/{id}/gyms": {
      "get": {
        "operationId": "AdminTrainerGymsController_findAll",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Залы тренера",
        "tags": [
          "admin"
        ]
      },
      "post": {
        "operationId": "AdminTrainerGymsController_link",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/LinkGymDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Привязать тренера к залу",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/admin/trainers/{id}/gyms/{gymId}": {
      "delete": {
        "operationId": "AdminTrainerGymsController_unlink",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "gymId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Отвязать тренера от зала",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/admin/clients/{id}/gyms": {
      "get": {
        "operationId": "AdminClientGymsController_findAll",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Залы клиента",
        "tags": [
          "admin"
        ]
      },
      "post": {
        "operationId": "AdminClientGymsController_link",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/LinkGymDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Привязать клиента к залу",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/admin/clients/{id}/gyms/{gymId}": {
      "delete": {
        "operationId": "AdminClientGymsController_unlink",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "gymId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Отвязать клиента от зала",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/trainer/gyms": {
      "get": {
        "operationId": "TrainerGymsController_findAll",
        "parameters": [],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Мои залы",
        "tags": [
          "trainer"
        ]
      }
    },
    "/api/v1/client/gyms": {
      "get": {
        "operationId": "ClientGymsController_findGyms",
        "parameters": [],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Мои залы",
        "tags": [
          "client"
        ]
      }
    },
    "/api/v1/client/gyms/{gymId}/trainers": {
      "get": {
        "operationId": "ClientGymsController_findTrainers",
        "parameters": [
          {
            "name": "gymId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Тренеры зала",
        "tags": [
          "client"
        ]
      }
    },
    "/api/v1/client/gyms/{gymId}/trainers/{trainerId}/link": {
      "post": {
        "operationId": "ClientGymsController_linkTrainer",
        "parameters": [
          {
            "name": "gymId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "trainerId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Выбрать тренера в зале",
        "tags": [
          "client"
        ]
      }
    },
    "/api/v1/client/trainers": {
      "get": {
        "operationId": "ClientGymsController_findTrainersLinks",
        "parameters": [],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Мои тренеры",
        "tags": [
          "client"
        ]
      }
    },
    "/api/v1/client/trainers/{linkId}": {
      "delete": {
        "operationId": "ClientGymsController_unlinkTrainer",
        "parameters": [
          {
            "name": "linkId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Отвязать тренера",
        "tags": [
          "client"
        ]
      }
    },
    "/api/v1/admin/gyms/{gymId}/equipment": {
      "get": {
        "operationId": "AdminEquipmentController_findByGym",
        "parameters": [
          {
            "name": "gymId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Оборудование зала",
        "tags": [
          "admin"
        ]
      },
      "post": {
        "operationId": "AdminEquipmentController_create",
        "parameters": [
          {
            "name": "gymId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateEquipmentDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Добавить оборудование в зал",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/admin/equipment/{id}": {
      "put": {
        "operationId": "AdminEquipmentController_update",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateEquipmentDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Обновить оборудование",
        "tags": [
          "admin"
        ]
      },
      "delete": {
        "operationId": "AdminEquipmentController_remove",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Удалить оборудование",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/gyms/{gymId}/equipment": {
      "get": {
        "operationId": "GymEquipmentController_findAll",
        "parameters": [
          {
            "name": "gymId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Оборудование зала (любая роль)",
        "tags": [
          "shared"
        ]
      }
    },
    "/api/v1/admin/exercises": {
      "get": {
        "operationId": "AdminExercisesController_findAll",
        "parameters": [],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Список упражнений",
        "tags": [
          "admin"
        ]
      },
      "post": {
        "operationId": "AdminExercisesController_create",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateExerciseDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Создать упражнение",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/admin/exercises/{id}": {
      "put": {
        "operationId": "AdminExercisesController_update",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateExerciseDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Обновить упражнение",
        "tags": [
          "admin"
        ]
      },
      "delete": {
        "operationId": "AdminExercisesController_remove",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Удалить упражнение",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/exercises": {
      "get": {
        "operationId": "SharedExercisesController_findAll",
        "parameters": [
          {
            "name": "type",
            "required": false,
            "in": "query",
            "schema": {
              "enum": [
                "EQUIPMENT",
                "FREE_WEIGHT",
                "BODYWEIGHT",
                "CARDIO"
              ],
              "type": "string"
            }
          },
          {
            "name": "muscle_group",
            "required": false,
            "in": "query",
            "schema": {
              "example": "Грудь",
              "type": "string"
            }
          },
          {
            "name": "q",
            "required": false,
            "in": "query",
            "schema": {
              "example": "жим",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Список упражнений (любая роль)",
        "tags": [
          "shared"
        ]
      }
    },
    "/api/v1/admin/food-products": {
      "get": {
        "operationId": "FoodProductsController_findAll",
        "parameters": [],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Список продуктов питания",
        "tags": [
          "admin"
        ]
      },
      "post": {
        "operationId": "FoodProductsController_create",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateFoodProductDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Создать продукт питания",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/admin/food-products/{id}": {
      "put": {
        "operationId": "FoodProductsController_update",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateFoodProductDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Обновить продукт питания",
        "tags": [
          "admin"
        ]
      },
      "delete": {
        "operationId": "FoodProductsController_remove",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Удалить продукт питания",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/admin/clients": {
      "get": {
        "operationId": "ClientsController_findAll",
        "parameters": [
          {
            "name": "page",
            "required": false,
            "in": "query",
            "schema": {
              "minimum": 1,
              "default": 1,
              "type": "number"
            }
          },
          {
            "name": "limit",
            "required": false,
            "in": "query",
            "schema": {
              "minimum": 1,
              "maximum": 100,
              "default": 20,
              "type": "number"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Список клиентов",
        "tags": [
          "admin"
        ]
      },
      "post": {
        "operationId": "ClientsController_create",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateClientDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Создать клиента",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/admin/clients/{id}": {
      "put": {
        "operationId": "ClientsController_update",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateClientDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Обновить клиента",
        "tags": [
          "admin"
        ]
      },
      "delete": {
        "operationId": "ClientsController_remove",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Удалить клиента",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/admin/clients/{id}/reset-password": {
      "post": {
        "operationId": "ClientsController_resetPassword",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ResetPasswordDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Сбросить пароль клиента",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/admin/goals": {
      "get": {
        "operationId": "AdminGoalsController_findAll",
        "parameters": [],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Список целей (включая неактивные)",
        "tags": [
          "admin"
        ]
      },
      "post": {
        "operationId": "AdminGoalsController_create",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateGoalDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Создать цель",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/admin/goals/{id}": {
      "put": {
        "operationId": "AdminGoalsController_update",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateGoalDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Обновить цель",
        "tags": [
          "admin"
        ]
      },
      "delete": {
        "operationId": "AdminGoalsController_remove",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Удалить цель",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/goals": {
      "get": {
        "operationId": "GoalsController_findAll",
        "parameters": [],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Активные цели",
        "tags": [
          "shared"
        ]
      }
    },
    "/api/v1/client/goal": {
      "get": {
        "operationId": "ClientGoalController_getGoal",
        "parameters": [],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Текущая цель клиента",
        "tags": [
          "client"
        ]
      },
      "put": {
        "operationId": "ClientGoalController_setGoal",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/SetClientGoalDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Выбрать цель клиента",
        "tags": [
          "client"
        ]
      }
    },
    "/api/v1/admin/trainers": {
      "get": {
        "operationId": "TrainersController_findAll",
        "parameters": [
          {
            "name": "page",
            "required": false,
            "in": "query",
            "schema": {
              "minimum": 1,
              "default": 1,
              "type": "number"
            }
          },
          {
            "name": "limit",
            "required": false,
            "in": "query",
            "schema": {
              "minimum": 1,
              "maximum": 100,
              "default": 20,
              "type": "number"
            }
          },
          {
            "name": "include_archived",
            "required": false,
            "in": "query",
            "schema": {
              "default": false,
              "type": "boolean"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Список тренеров",
        "tags": [
          "admin"
        ]
      },
      "post": {
        "operationId": "TrainersController_create",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateTrainerDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Создать тренера",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/admin/trainers/{id}": {
      "put": {
        "operationId": "TrainersController_update",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateTrainerDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Обновить тренера",
        "tags": [
          "admin"
        ]
      },
      "delete": {
        "operationId": "TrainersController_remove",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Архивировать тренера",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/admin/trainers/{id}/reset-password": {
      "post": {
        "operationId": "TrainersController_resetPassword",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ResetPasswordDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Сбросить пароль тренера",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/admin/clients/{id}/trainers": {
      "post": {
        "operationId": "ClientTrainersController_link",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/LinkTrainerDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Привязать тренера к клиенту",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/admin/clients/{id}/trainers/{linkId}": {
      "delete": {
        "operationId": "ClientTrainersController_unlink",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "linkId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Отвязать тренера (isActive=false)",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/client/{id}/weight-measurements": {
      "get": {
        "operationId": "WeightMeasurementsController_findAll",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "История замеров клиента",
        "tags": [
          "trainer"
        ]
      },
      "post": {
        "operationId": "WeightMeasurementsController_create",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateWeightMeasurementDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Добавить замер клиента",
        "tags": [
          "trainer"
        ]
      }
    },
    "/api/v1/admin/clients/{id}/weight-measurements": {
      "get": {
        "operationId": "AdminWeightMeasurementsController_findAll",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "История замеров клиента (администратор)",
        "tags": [
          "admin"
        ]
      },
      "post": {
        "operationId": "AdminWeightMeasurementsController_create",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateWeightMeasurementDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Добавить замер клиента (администратор)",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/reports/weight-dynamics": {
      "get": {
        "operationId": "ReportsController_weightDynamics",
        "parameters": [
          {
            "name": "client_id",
            "required": false,
            "in": "query",
            "schema": {
              "format": "uuid",
              "type": "string"
            }
          },
          {
            "name": "from",
            "required": false,
            "in": "query",
            "schema": {
              "format": "date",
              "type": "string"
            }
          },
          {
            "name": "to",
            "required": false,
            "in": "query",
            "schema": {
              "format": "date",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Динамика веса и жира",
        "tags": [
          "reports"
        ]
      }
    },
    "/api/v1/reports/exercise-progress": {
      "get": {
        "operationId": "ReportsController_exerciseProgress",
        "parameters": [
          {
            "name": "client_id",
            "required": false,
            "in": "query",
            "schema": {
              "format": "uuid",
              "type": "string"
            }
          },
          {
            "name": "exercise_id",
            "required": true,
            "in": "query",
            "schema": {
              "format": "uuid",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Прогресс по упражнению (план vs факт)",
        "tags": [
          "reports"
        ]
      }
    },
    "/api/v1/reports/exercises-summary": {
      "get": {
        "operationId": "ReportsController_exercisesSummary",
        "parameters": [
          {
            "name": "client_id",
            "required": false,
            "in": "query",
            "schema": {
              "format": "uuid",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Упражнения с историей",
        "tags": [
          "reports"
        ]
      }
    },
    "/api/v1/reports/attendance": {
      "get": {
        "operationId": "ReportsController_attendance",
        "parameters": [
          {
            "name": "from",
            "required": false,
            "in": "query",
            "schema": {
              "format": "date",
              "type": "string"
            }
          },
          {
            "name": "to",
            "required": false,
            "in": "query",
            "schema": {
              "format": "date",
              "type": "string"
            }
          },
          {
            "name": "gym_id",
            "required": false,
            "in": "query",
            "schema": {
              "format": "uuid",
              "type": "string"
            }
          },
          {
            "name": "trainer_id",
            "required": false,
            "in": "query",
            "schema": {
              "format": "uuid",
              "type": "string"
            }
          },
          {
            "name": "client_id",
            "required": false,
            "in": "query",
            "schema": {
              "format": "uuid",
              "type": "string"
            }
          },
          {
            "name": "group_by",
            "required": false,
            "in": "query",
            "schema": {
              "default": "day",
              "enum": [
                "day",
                "week",
                "month"
              ],
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Посещаемость",
        "tags": [
          "reports"
        ]
      }
    },
    "/api/v1/reports/equipment-usage": {
      "get": {
        "operationId": "ReportsController_equipmentUsage",
        "parameters": [
          {
            "name": "from",
            "required": false,
            "in": "query",
            "schema": {
              "format": "date",
              "type": "string"
            }
          },
          {
            "name": "to",
            "required": false,
            "in": "query",
            "schema": {
              "format": "date",
              "type": "string"
            }
          },
          {
            "name": "gym_id",
            "required": false,
            "in": "query",
            "schema": {
              "format": "uuid",
              "type": "string"
            }
          },
          {
            "name": "trainer_id",
            "required": false,
            "in": "query",
            "schema": {
              "format": "uuid",
              "type": "string"
            }
          },
          {
            "name": "client_id",
            "required": false,
            "in": "query",
            "schema": {
              "format": "uuid",
              "type": "string"
            }
          },
          {
            "name": "group_by",
            "required": false,
            "in": "query",
            "schema": {
              "default": "equipment",
              "enum": [
                "type",
                "equipment",
                "client"
              ],
              "type": "string"
            }
          },
          {
            "name": "period",
            "required": false,
            "in": "query",
            "schema": {
              "default": "day",
              "enum": [
                "day",
                "week",
                "month"
              ],
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Использование тренажёров",
        "tags": [
          "reports"
        ]
      }
    },
    "/api/v1/reports/trainers": {
      "get": {
        "operationId": "ReportsController_trainers",
        "parameters": [
          {
            "name": "from",
            "required": false,
            "in": "query",
            "schema": {
              "format": "date",
              "type": "string"
            }
          },
          {
            "name": "to",
            "required": false,
            "in": "query",
            "schema": {
              "format": "date",
              "type": "string"
            }
          },
          {
            "name": "gym_id",
            "required": false,
            "in": "query",
            "schema": {
              "format": "uuid",
              "type": "string"
            }
          },
          {
            "name": "trainer_id",
            "required": false,
            "in": "query",
            "schema": {
              "format": "uuid",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Отчёт по тренерам",
        "tags": [
          "reports"
        ]
      }
    },
    "/api/v1/reports/pdf/weight": {
      "get": {
        "operationId": "ReportsController_weightPdf",
        "parameters": [
          {
            "name": "client_id",
            "required": false,
            "in": "query",
            "schema": {
              "format": "uuid",
              "type": "string"
            }
          },
          {
            "name": "period",
            "required": false,
            "in": "query",
            "schema": {
              "default": "week",
              "enum": [
                "week",
                "month",
                "3months",
                "year",
                "custom"
              ],
              "type": "string"
            }
          },
          {
            "name": "from",
            "required": false,
            "in": "query",
            "schema": {
              "format": "date",
              "type": "string"
            }
          },
          {
            "name": "to",
            "required": false,
            "in": "query",
            "schema": {
              "format": "date",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "PDF-отчёт по весу (таблица)",
        "tags": [
          "reports"
        ]
      }
    },
    "/api/v1/reports/pdf/exercises": {
      "get": {
        "operationId": "ReportsController_exercisesPdf",
        "parameters": [
          {
            "name": "client_id",
            "required": false,
            "in": "query",
            "schema": {
              "format": "uuid",
              "type": "string"
            }
          },
          {
            "name": "period",
            "required": false,
            "in": "query",
            "schema": {
              "default": "week",
              "enum": [
                "week",
                "month",
                "3months",
                "year",
                "custom"
              ],
              "type": "string"
            }
          },
          {
            "name": "from",
            "required": false,
            "in": "query",
            "schema": {
              "format": "date",
              "type": "string"
            }
          },
          {
            "name": "to",
            "required": false,
            "in": "query",
            "schema": {
              "format": "date",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "PDF-отчёт по выполнению упражнений (таблица)",
        "tags": [
          "reports"
        ]
      }
    },
    "/api/v1/admin/server/settings": {
      "get": {
        "operationId": "ServerSettingsController_settings",
        "parameters": [],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Настройки HTTPS-сервера",
        "tags": [
          "admin"
        ]
      },
      "patch": {
        "operationId": "ServerSettingsController_update",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateServerSettingsDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Изменить порт HTTPS-сервера",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/admin/server/certificate": {
      "post": {
        "operationId": "ServerSettingsController_uploadCertificate",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "required": [
                  "certificate",
                  "privateKey"
                ],
                "properties": {
                  "certificate": {
                    "type": "string",
                    "format": "binary"
                  },
                  "privateKey": {
                    "type": "string",
                    "format": "binary"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Загрузить сертификат и приватный ключ",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/admin/server/certificate/reset": {
      "post": {
        "operationId": "ServerSettingsController_resetCertificate",
        "parameters": [],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Вернуть встроенный сертификат",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/admin/templates": {
      "get": {
        "operationId": "AdminTemplatesController_findAll",
        "parameters": [],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Глобальные шаблоны и шаблоны залов",
        "tags": [
          "admin"
        ]
      },
      "post": {
        "operationId": "AdminTemplatesController_create",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateAdminWorkoutTemplateDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Создать глобальный шаблон или шаблон зала",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/admin/templates/{id}": {
      "put": {
        "operationId": "AdminTemplatesController_update",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateAdminWorkoutTemplateDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Обновить шаблон",
        "tags": [
          "admin"
        ]
      },
      "delete": {
        "operationId": "AdminTemplatesController_remove",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Архивировать шаблон",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/administrator/templates": {
      "get": {
        "operationId": "AdministratorTemplatesController_findAll",
        "parameters": [],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Шаблоны моего зала",
        "tags": [
          "administrator"
        ]
      },
      "post": {
        "operationId": "AdministratorTemplatesController_create",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateWorkoutTemplateDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Создать шаблон тренировки для своего зала",
        "tags": [
          "administrator"
        ]
      }
    },
    "/api/v1/administrator/templates/{id}": {
      "put": {
        "operationId": "AdministratorTemplatesController_update",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateWorkoutTemplateDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Обновить шаблон своего зала",
        "tags": [
          "administrator"
        ]
      },
      "delete": {
        "operationId": "AdministratorTemplatesController_remove",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Архивировать шаблон своего зала",
        "tags": [
          "administrator"
        ]
      }
    },
    "/api/v1/trainer/templates": {
      "get": {
        "operationId": "TrainerTemplatesController_findAll",
        "parameters": [
          {
            "name": "search",
            "required": true,
            "in": "query",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Шаблоны тренировок тренера",
        "tags": [
          "trainer"
        ]
      },
      "post": {
        "operationId": "TrainerTemplatesController_create",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateWorkoutTemplateDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Создать шаблон тренировки",
        "tags": [
          "trainer"
        ]
      }
    },
    "/api/v1/trainer/templates/{id}": {
      "get": {
        "operationId": "TrainerTemplatesController_findOne",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Шаблон тренировки",
        "tags": [
          "trainer"
        ]
      },
      "put": {
        "operationId": "TrainerTemplatesController_update",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateWorkoutTemplateDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Обновить шаблон тренировки",
        "tags": [
          "trainer"
        ]
      },
      "delete": {
        "operationId": "TrainerTemplatesController_remove",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Архивировать личный шаблон тренировки",
        "tags": [
          "trainer"
        ]
      }
    },
    "/api/v1/trainer/workouts": {
      "get": {
        "operationId": "TrainerWorkoutsController_findAll",
        "parameters": [
          {
            "name": "page",
            "required": false,
            "in": "query",
            "schema": {
              "minimum": 1,
              "default": 1,
              "type": "number"
            }
          },
          {
            "name": "limit",
            "required": false,
            "in": "query",
            "schema": {
              "minimum": 1,
              "maximum": 100,
              "default": 20,
              "type": "number"
            }
          },
          {
            "name": "client_id",
            "required": false,
            "in": "query",
            "schema": {
              "format": "uuid",
              "type": "string"
            }
          },
          {
            "name": "gym_id",
            "required": false,
            "in": "query",
            "schema": {
              "format": "uuid",
              "type": "string"
            }
          },
          {
            "name": "from",
            "required": false,
            "in": "query",
            "schema": {
              "format": "date",
              "example": "2026-11-01",
              "type": "string"
            }
          },
          {
            "name": "to",
            "required": false,
            "in": "query",
            "schema": {
              "format": "date",
              "example": "2026-11-30",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Тренировки клиентов тренера",
        "tags": [
          "trainer"
        ]
      },
      "post": {
        "operationId": "TrainerWorkoutsController_create",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateWorkoutDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Назначить тренировку клиенту",
        "tags": [
          "trainer"
        ]
      }
    },
    "/api/v1/trainer/workouts/{id}": {
      "get": {
        "operationId": "TrainerWorkoutsController_findOne",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Тренировка клиента тренера",
        "tags": [
          "trainer"
        ]
      },
      "put": {
        "operationId": "TrainerWorkoutsController_update",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateWorkoutDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Изменить тренировку клиента",
        "tags": [
          "trainer"
        ]
      }
    },
    "/api/v1/trainer/workouts/{id}/start": {
      "post": {
        "operationId": "TrainerWorkoutsController_start",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Начать тренировку клиента",
        "tags": [
          "trainer"
        ]
      }
    },
    "/api/v1/trainer/workouts/{id}/finish": {
      "post": {
        "operationId": "TrainerWorkoutsController_finish",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Завершить тренировку клиента",
        "tags": [
          "trainer"
        ]
      }
    },
    "/api/v1/client/workouts": {
      "get": {
        "operationId": "ClientWorkoutsController_findAll",
        "parameters": [
          {
            "name": "page",
            "required": false,
            "in": "query",
            "schema": {
              "minimum": 1,
              "default": 1,
              "type": "number"
            }
          },
          {
            "name": "limit",
            "required": false,
            "in": "query",
            "schema": {
              "minimum": 1,
              "maximum": 100,
              "default": 20,
              "type": "number"
            }
          },
          {
            "name": "from",
            "required": true,
            "in": "query",
            "schema": {
              "format": "date",
              "example": "2026-11-01",
              "type": "string"
            }
          },
          {
            "name": "to",
            "required": true,
            "in": "query",
            "schema": {
              "format": "date",
              "example": "2026-11-30",
              "type": "string"
            }
          },
          {
            "name": "gym_id",
            "required": false,
            "in": "query",
            "schema": {
              "format": "uuid",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Календарь тренировок клиента",
        "tags": [
          "client"
        ]
      }
    },
    "/api/v1/client/workouts/{id}": {
      "get": {
        "operationId": "ClientWorkoutsController_findOne",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Тренировка клиента",
        "tags": [
          "client"
        ]
      }
    },
    "/api/v1/client/workouts/{id}/start": {
      "post": {
        "operationId": "ClientWorkoutsController_start",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Начать тренировку",
        "tags": [
          "client"
        ]
      }
    },
    "/api/v1/client/workouts/{id}/finish": {
      "post": {
        "operationId": "ClientWorkoutsController_finish",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Завершить тренировку",
        "tags": [
          "client"
        ]
      }
    },
    "/api/v1/client/workout-items/{id}/result": {
      "put": {
        "operationId": "ClientWorkoutItemsController_updateResult",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateWorkoutItemResultDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Отметить выполнение упражнения",
        "tags": [
          "client"
        ]
      }
    },
    "/api/v1/trainer/workout-items/{id}/result": {
      "put": {
        "operationId": "TrainerWorkoutItemsController_updateResult",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateWorkoutItemResultDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Отметить выполнение упражнения клиента",
        "tags": [
          "trainer"
        ]
      }
    },
    "/api/v1/admin/notifications": {
      "post": {
        "operationId": "NotificationsController_create",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateNotificationDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Отправить уведомление клиентам",
        "tags": [
          "notifications"
        ]
      }
    },
    "/api/v1/notifications": {
      "get": {
        "operationId": "NotificationsController_findAll",
        "parameters": [
          {
            "name": "page",
            "required": false,
            "in": "query",
            "schema": {
              "minimum": 1,
              "default": 1,
              "type": "number"
            }
          },
          {
            "name": "limit",
            "required": false,
            "in": "query",
            "schema": {
              "minimum": 1,
              "maximum": 100,
              "default": 20,
              "type": "number"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Мои уведомления",
        "tags": [
          "notifications"
        ]
      }
    },
    "/api/v1/notifications/{id}/read": {
      "post": {
        "operationId": "NotificationsController_markRead",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Отметить уведомление прочитанным",
        "tags": [
          "notifications"
        ]
      }
    },
    "/api/v1/trainer/clients": {
      "get": {
        "operationId": "TrainerClientsController_findAll",
        "parameters": [
          {
            "name": "gym_id",
            "required": false,
            "in": "query",
            "schema": {
              "format": "uuid",
              "type": "string"
            }
          },
          {
            "name": "search",
            "required": false,
            "in": "query",
            "description": "Поиск по ФИО",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Мои клиенты (активная связь)",
        "tags": [
          "trainer"
        ]
      }
    },
    "/api/v1/trainer/nutrition": {
      "get": {
        "operationId": "TrainerNutritionController_findByClient",
        "parameters": [
          {
            "name": "client_id",
            "required": true,
            "in": "query",
            "schema": {
              "format": "uuid",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Рекомендации питания клиента для тренера",
        "tags": [
          "trainer"
        ]
      },
      "post": {
        "operationId": "TrainerNutritionController_create",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateNutritionDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Назначить питание клиенту",
        "tags": [
          "trainer"
        ]
      }
    },
    "/api/v1/trainer/nutrition/{id}/archive": {
      "post": {
        "operationId": "TrainerNutritionController_archive",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Отправить рекомендацию в архив",
        "tags": [
          "trainer"
        ]
      }
    },
    "/api/v1/trainer/nutrition/{id}/cancel": {
      "post": {
        "operationId": "TrainerNutritionController_cancel",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Отменить рекомендацию питания",
        "tags": [
          "trainer"
        ]
      }
    },
    "/api/v1/client/nutrition": {
      "get": {
        "operationId": "ClientNutritionController_findAll",
        "parameters": [
          {
            "name": "date",
            "required": false,
            "in": "query",
            "schema": {
              "format": "date",
              "example": "2026-11-08",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Питание клиента на дату",
        "tags": [
          "client"
        ]
      }
    },
    "/api/v1/chats": {
      "get": {
        "operationId": "ChatsController_findAll",
        "parameters": [
          {
            "name": "page",
            "required": false,
            "in": "query",
            "schema": {
              "minimum": 1,
              "default": 1,
              "type": "number"
            }
          },
          {
            "name": "limit",
            "required": false,
            "in": "query",
            "schema": {
              "minimum": 1,
              "maximum": 100,
              "default": 20,
              "type": "number"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Список чатов (ADMIN — все 1:1 чаты)",
        "tags": [
          "shared"
        ]
      },
      "post": {
        "operationId": "ChatsController_create",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateChatDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Создать или получить чат",
        "tags": [
          "shared"
        ]
      }
    },
    "/api/v1/chats/{id}/messages": {
      "get": {
        "operationId": "ChatsController_findMessages",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "before",
            "required": false,
            "in": "query",
            "schema": {
              "format": "date-time",
              "type": "string"
            }
          },
          {
            "name": "limit",
            "required": false,
            "in": "query",
            "schema": {
              "maximum": 100,
              "default": 50,
              "type": "number"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "История сообщений чата",
        "tags": [
          "shared"
        ]
      },
      "post": {
        "operationId": "ChatsController_sendMessage",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/SendMessageDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Отправить сообщение",
        "tags": [
          "shared"
        ]
      }
    },
    "/api/v1/chats/{id}/read": {
      "post": {
        "operationId": "ChatsController_markRead",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Отметить сообщения чата прочитанными",
        "tags": [
          "shared"
        ]
      }
    },
    "/api/v1/admin/administrators": {
      "get": {
        "operationId": "AdministratorsController_findAll",
        "parameters": [],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Список администраторов",
        "tags": [
          "admin"
        ]
      },
      "post": {
        "operationId": "AdministratorsController_create",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateAdministratorDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Создать администратор",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/admin/administrators/{id}": {
      "put": {
        "operationId": "AdministratorsController_update",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateAdministratorDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Обновить администратор",
        "tags": [
          "admin"
        ]
      },
      "delete": {
        "operationId": "AdministratorsController_remove",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Удалить администратор",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/admin/administrators/{id}/reset-password": {
      "post": {
        "operationId": "AdministratorsController_resetPassword",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ResetPasswordDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Сбросить пароль администратора",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/administrator/gyms": {
      "get": {
        "operationId": "AdministratorController_getGym",
        "parameters": [],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Мой зал",
        "tags": [
          "administrator"
        ]
      }
    },
    "/api/v1/administrator/clients": {
      "get": {
        "operationId": "AdministratorController_findClients",
        "parameters": [
          {
            "name": "page",
            "required": false,
            "in": "query",
            "schema": {
              "minimum": 1,
              "default": 1,
              "type": "number"
            }
          },
          {
            "name": "limit",
            "required": false,
            "in": "query",
            "schema": {
              "minimum": 1,
              "maximum": 100,
              "default": 20,
              "type": "number"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Клиенты моего зала",
        "tags": [
          "administrator"
        ]
      },
      "post": {
        "operationId": "AdministratorController_createClient",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateClientDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Создать клиента в своём зале",
        "tags": [
          "administrator"
        ]
      }
    },
    "/api/v1/administrator/clients/{id}": {
      "get": {
        "operationId": "AdministratorController_findClient",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Клиент своего зала",
        "tags": [
          "administrator"
        ]
      },
      "put": {
        "operationId": "AdministratorController_updateClient",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateClientDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Обновить клиента своего зала",
        "tags": [
          "administrator"
        ]
      }
    },
    "/api/v1/administrator/clients/{id}/weight-measurements": {
      "get": {
        "operationId": "AdministratorController_findWeightMeasurements",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Замеры веса клиента своего зала",
        "tags": [
          "administrator"
        ]
      },
      "post": {
        "operationId": "AdministratorController_createWeightMeasurement",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateWeightMeasurementDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Добавить замер веса клиента своего зала",
        "tags": [
          "administrator"
        ]
      }
    },
    "/api/v1/administrator/clients/{id}/reset-password": {
      "post": {
        "operationId": "AdministratorController_resetClientPassword",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ResetPasswordDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Сбросить пароль клиента своего зала",
        "tags": [
          "administrator"
        ]
      }
    },
    "/api/v1/administrator/clients/{id}/photo": {
      "post": {
        "operationId": "AdministratorController_setClientPhoto",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdatePhotoDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Задать фото клиента",
        "tags": [
          "administrator"
        ]
      }
    },
    "/api/v1/administrator/clients/{id}/trainers": {
      "get": {
        "operationId": "AdministratorController_findClientTrainers",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Тренеры клиента в моём зале",
        "tags": [
          "administrator"
        ]
      },
      "post": {
        "operationId": "AdministratorController_linkTrainer",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/LinkAdministratorTrainerDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Назначить тренера клиенту",
        "tags": [
          "administrator"
        ]
      }
    },
    "/api/v1/administrator/clients/{id}/trainers/{linkId}": {
      "delete": {
        "operationId": "AdministratorController_unlinkTrainer",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "linkId",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Отвязать тренера от клиента",
        "tags": [
          "administrator"
        ]
      }
    },
    "/api/v1/administrator/trainers": {
      "get": {
        "operationId": "AdministratorController_findTrainers",
        "parameters": [
          {
            "name": "page",
            "required": false,
            "in": "query",
            "schema": {
              "minimum": 1,
              "default": 1,
              "type": "number"
            }
          },
          {
            "name": "limit",
            "required": false,
            "in": "query",
            "schema": {
              "minimum": 1,
              "maximum": 100,
              "default": 20,
              "type": "number"
            }
          }
        ],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Тренеры моего зала",
        "tags": [
          "administrator"
        ]
      },
      "post": {
        "operationId": "AdministratorController_createTrainer",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateTrainerDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Создать тренера в своём зале",
        "tags": [
          "administrator"
        ]
      }
    },
    "/api/v1/administrator/trainers/{id}/reset-password": {
      "post": {
        "operationId": "AdministratorController_resetTrainerPassword",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ResetPasswordDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Сбросить пароль тренера своего зала",
        "tags": [
          "administrator"
        ]
      }
    },
    "/api/v1/administrator/trainers/{id}": {
      "put": {
        "operationId": "AdministratorController_updateTrainer",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateTrainerDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Обновить тренера своего зала",
        "tags": [
          "administrator"
        ]
      }
    },
    "/api/v1/administrator/trainers/{id}/photo": {
      "post": {
        "operationId": "AdministratorController_setTrainerPhoto",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdatePhotoDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Задать фото тренера",
        "tags": [
          "administrator"
        ]
      }
    },
    "/api/v1/admin/dashboard/stats": {
      "get": {
        "operationId": "DashboardController_getStats",
        "parameters": [],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "tags": [
          "Dashboard"
        ]
      }
    },
    "/api/v1/admin/demo/status": {
      "get": {
        "operationId": "DemoController_status",
        "parameters": [],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Статус демо-данных",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/admin/demo/load": {
      "post": {
        "operationId": "DemoController_load",
        "parameters": [],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Загрузить демо-данные",
        "tags": [
          "admin"
        ]
      }
    },
    "/api/v1/admin/demo": {
      "delete": {
        "operationId": "DemoController_clear",
        "parameters": [],
        "responses": {
          "200": {
            "description": ""
          }
        },
        "security": [
          {
            "bearer": []
          }
        ],
        "summary": "Очистить демо-данные",
        "tags": [
          "admin"
        ]
      }
    }
  },
  "info": {
    "title": "Gym MVP API",
    "description": "API спортивного зала",
    "version": "1.1.0",
    "contact": {}
  },
  "tags": [],
  "servers": [],
  "components": {
    "securitySchemes": {
      "bearer": {
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "type": "http"
      }
    },
    "schemas": {
      "LoginDto": {
        "type": "object",
        "properties": {
          "phone": {
            "type": "string",
            "example": "+79001234567"
          },
          "password": {
            "type": "string",
            "format": "password"
          }
        },
        "required": [
          "phone",
          "password"
        ]
      },
      "RefreshDto": {
        "type": "object",
        "properties": {
          "refresh_token": {
            "type": "string",
            "description": "Refresh-токен. Для web-admin не требуется: берётся из httpOnly-cookie."
          }
        }
      },
      "ChangePasswordDto": {
        "type": "object",
        "properties": {
          "current_password": {
            "type": "string",
            "minLength": 1,
            "maxLength": 128
          },
          "new_password": {
            "type": "string",
            "minLength": 8,
            "maxLength": 128
          }
        },
        "required": [
          "current_password",
          "new_password"
        ]
      },
      "UpdateTimezoneDto": {
        "type": "object",
        "properties": {
          "timezone": {
            "type": "string",
            "example": "Europe/Moscow"
          }
        },
        "required": [
          "timezone"
        ]
      },
      "UpdatePushTokenDto": {
        "type": "object",
        "properties": {
          "token": {
            "type": "string",
            "description": "FCM registration token"
          }
        },
        "required": [
          "token"
        ]
      },
      "CreateGymDto": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "example": "Фитнес-клуб «Олимп»"
          },
          "address": {
            "type": "string",
            "example": "ул. Ленина, 1"
          },
          "isActive": {
            "type": "boolean",
            "default": true
          }
        },
        "required": [
          "name",
          "address"
        ]
      },
      "UpdateGymDto": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "example": "Фитнес-клуб «Олимп»"
          },
          "address": {
            "type": "string",
            "example": "ул. Ленина, 1"
          },
          "isActive": {
            "type": "boolean",
            "default": true
          }
        }
      },
      "LinkGymDto": {
        "type": "object",
        "properties": {
          "gym_id": {
            "type": "string",
            "format": "uuid"
          }
        },
        "required": [
          "gym_id"
        ]
      },
      "CreateEquipmentDto": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "example": "Беговая дорожка"
          },
          "type": {
            "type": "string",
            "enum": [
              "MACHINE",
              "FREE_WEIGHT",
              "CARDIO",
              "OTHER"
            ],
            "example": "CARDIO"
          },
          "minWeight": {
            "type": "number",
            "example": 0
          },
          "maxWeight": {
            "type": "number",
            "example": 120
          },
          "photoUrl": {
            "type": "string",
            "example": "/uploads/uuid.png"
          },
          "description": {
            "type": "string",
            "example": "Профессиональная беговая дорожка"
          }
        },
        "required": [
          "name",
          "type"
        ]
      },
      "UpdateEquipmentDto": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "example": "Беговая дорожка"
          },
          "type": {
            "type": "string",
            "enum": [
              "MACHINE",
              "FREE_WEIGHT",
              "CARDIO",
              "OTHER"
            ],
            "example": "CARDIO"
          },
          "minWeight": {
            "type": "number",
            "example": 0
          },
          "maxWeight": {
            "type": "number",
            "example": 120
          },
          "photoUrl": {
            "type": "string",
            "example": "/uploads/uuid.png"
          },
          "description": {
            "type": "string",
            "example": "Профессиональная беговая дорожка"
          }
        }
      },
      "CreateExerciseDto": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "example": "Жим лёжа"
          },
          "type": {
            "type": "string",
            "enum": [
              "EQUIPMENT",
              "FREE_WEIGHT",
              "BODYWEIGHT",
              "CARDIO"
            ],
            "example": "FREE_WEIGHT"
          },
          "muscleGroup": {
            "type": "string",
            "example": "Грудь"
          },
          "requiresEquipment": {
            "type": "boolean",
            "example": false
          },
          "videoUrl": {
            "type": "string",
            "example": "https://youtube.com/watch?v=example"
          },
          "description": {
            "type": "string",
            "example": "Базовое упражнение"
          }
        },
        "required": [
          "name",
          "type",
          "requiresEquipment"
        ]
      },
      "UpdateExerciseDto": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "example": "Жим лёжа"
          },
          "type": {
            "type": "string",
            "enum": [
              "EQUIPMENT",
              "FREE_WEIGHT",
              "BODYWEIGHT",
              "CARDIO"
            ],
            "example": "FREE_WEIGHT"
          },
          "muscleGroup": {
            "type": "string",
            "example": "Грудь"
          },
          "requiresEquipment": {
            "type": "boolean",
            "example": false
          },
          "videoUrl": {
            "type": "string",
            "example": "https://youtube.com/watch?v=example"
          },
          "description": {
            "type": "string",
            "example": "Базовое упражнение"
          }
        }
      },
      "CreateFoodProductDto": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "example": "Куриная грудка"
          },
          "kcal": {
            "type": "number",
            "example": 165,
            "minimum": 0
          },
          "protein": {
            "type": "number",
            "example": 31,
            "minimum": 0
          },
          "fat": {
            "type": "number",
            "example": 3.6,
            "minimum": 0
          },
          "carbs": {
            "type": "number",
            "example": 0,
            "minimum": 0
          }
        },
        "required": [
          "name",
          "kcal",
          "protein",
          "fat",
          "carbs"
        ]
      },
      "UpdateFoodProductDto": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "example": "Куриная грудка"
          },
          "kcal": {
            "type": "number",
            "example": 165,
            "minimum": 0
          },
          "protein": {
            "type": "number",
            "example": 31,
            "minimum": 0
          },
          "fat": {
            "type": "number",
            "example": 3.6,
            "minimum": 0
          },
          "carbs": {
            "type": "number",
            "example": 0,
            "minimum": 0
          }
        }
      },
      "CreateClientDto": {
        "type": "object",
        "properties": {
          "phone": {
            "type": "string",
            "example": "+79990000010"
          },
          "name": {
            "type": "string",
            "example": "Иван Иванов"
          },
          "photoUrl": {
            "type": "string",
            "example": "/uploads/client.jpg"
          },
          "gender": {
            "type": "string",
            "enum": [
              "MALE",
              "FEMALE",
              "OTHER"
            ]
          },
          "height": {
            "type": "number",
            "example": 180,
            "minimum": 0,
            "description": "см"
          },
          "birthdate": {
            "type": "string",
            "example": "1990-01-01",
            "format": "date"
          },
          "startWeight": {
            "type": "number",
            "example": 80,
            "minimum": 0,
            "description": "кг"
          },
          "startFatMass": {
            "type": "number",
            "example": 20,
            "minimum": 0,
            "maximum": 100,
            "description": "%"
          },
          "goal": {
            "type": "string",
            "example": "Похудение",
            "deprecated": true
          },
          "goalId": {
            "type": "string",
            "format": "uuid",
            "description": "ID цели из справочника"
          },
          "notes": {
            "type": "string",
            "example": "Травма колена в анамнезе"
          }
        },
        "required": [
          "phone",
          "name"
        ]
      },
      "UpdateClientDto": {
        "type": "object",
        "properties": {
          "phone": {
            "type": "string",
            "example": "+79990000010"
          },
          "name": {
            "type": "string",
            "example": "Иван Иванов"
          },
          "photoUrl": {
            "type": "string",
            "example": "/uploads/client.jpg"
          },
          "gender": {
            "type": "string",
            "enum": [
              "MALE",
              "FEMALE",
              "OTHER"
            ]
          },
          "height": {
            "type": "number",
            "example": 180,
            "minimum": 0,
            "description": "см"
          },
          "birthdate": {
            "type": "string",
            "example": "1990-01-01",
            "format": "date"
          },
          "startWeight": {
            "type": "number",
            "example": 80,
            "minimum": 0,
            "description": "кг"
          },
          "startFatMass": {
            "type": "number",
            "example": 20,
            "minimum": 0,
            "maximum": 100,
            "description": "%"
          },
          "goal": {
            "type": "string",
            "example": "Похудение",
            "deprecated": true
          },
          "goalId": {
            "type": "string",
            "format": "uuid",
            "description": "ID цели из справочника"
          },
          "notes": {
            "type": "string",
            "example": "Травма колена в анамнезе"
          }
        }
      },
      "ResetPasswordDto": {
        "type": "object",
        "properties": {
          "password": {
            "type": "string",
            "minLength": 8,
            "maxLength": 128,
            "description": "Новый пароль. Если не передан, используется DEFAULT_CLIENT_PASSWORD."
          }
        }
      },
      "CreateGoalDto": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "example": "Похудение"
          },
          "description": {
            "type": "string",
            "example": "Снижение массы тела"
          },
          "isActive": {
            "type": "boolean",
            "example": true,
            "default": true
          },
          "sortOrder": {
            "type": "number",
            "example": 0,
            "default": 0
          }
        },
        "required": [
          "name"
        ]
      },
      "UpdateGoalDto": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "example": "Похудение"
          },
          "description": {
            "type": "string",
            "example": "Снижение массы тела"
          },
          "isActive": {
            "type": "boolean",
            "example": true,
            "default": true
          },
          "sortOrder": {
            "type": "number",
            "example": 0,
            "default": 0
          }
        }
      },
      "SetClientGoalDto": {
        "type": "object",
        "properties": {
          "goalId": {
            "type": "string",
            "format": "uuid"
          }
        },
        "required": [
          "goalId"
        ]
      },
      "CreateTrainerDto": {
        "type": "object",
        "properties": {
          "phone": {
            "type": "string",
            "example": "+79990000020"
          },
          "name": {
            "type": "string",
            "example": "Пётр Петров"
          },
          "photoUrl": {
            "type": "string",
            "example": "/uploads/trainer.jpg"
          }
        },
        "required": [
          "phone",
          "name"
        ]
      },
      "UpdateTrainerDto": {
        "type": "object",
        "properties": {
          "phone": {
            "type": "string",
            "example": "+79990000020"
          },
          "name": {
            "type": "string",
            "example": "Пётр Петров"
          },
          "photoUrl": {
            "type": "string",
            "example": "/uploads/trainer.jpg"
          }
        }
      },
      "LinkTrainerDto": {
        "type": "object",
        "properties": {
          "trainer_id": {
            "type": "string",
            "format": "uuid"
          },
          "gym_id": {
            "type": "string",
            "format": "uuid"
          }
        },
        "required": [
          "trainer_id",
          "gym_id"
        ]
      },
      "CreateWeightMeasurementDto": {
        "type": "object",
        "properties": {
          "weight": {
            "type": "number",
            "example": 80,
            "minimum": 0,
            "description": "кг"
          },
          "fatMass": {
            "type": "number",
            "example": 20,
            "minimum": 0,
            "maximum": 100,
            "description": "%"
          },
          "measuredAt": {
            "type": "string",
            "example": "2026-11-08T10:00:00.000Z",
            "format": "date-time"
          },
          "comment": {
            "type": "string",
            "example": "Утренний замер"
          }
        },
        "required": [
          "weight",
          "measuredAt"
        ]
      },
      "UpdateServerSettingsDto": {
        "type": "object",
        "properties": {
          "port": {
            "type": "number",
            "example": 3000,
            "minimum": 1,
            "maximum": 65535
          }
        },
        "required": [
          "port"
        ]
      },
      "WorkoutTemplateItemDto": {
        "type": "object",
        "properties": {
          "exerciseId": {
            "type": "string",
            "format": "uuid"
          },
          "equipmentId": {
            "type": "string",
            "format": "uuid",
            "nullable": true
          },
          "plannedWeight": {
            "type": "number",
            "nullable": true,
            "description": "кг"
          },
          "plannedSets": {
            "type": "number",
            "minimum": 1
          },
          "plannedReps": {
            "type": "number",
            "minimum": 1
          },
          "restSec": {
            "type": "number",
            "nullable": true,
            "description": "сек"
          },
          "order": {
            "type": "number",
            "minimum": 0
          }
        },
        "required": [
          "exerciseId",
          "plannedSets",
          "plannedReps",
          "order"
        ]
      },
      "CreateAdminWorkoutTemplateDto": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "description": {
            "type": "string",
            "nullable": true
          },
          "items": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/WorkoutTemplateItemDto"
            }
          },
          "gym_id": {
            "type": "object",
            "format": "uuid",
            "nullable": true,
            "description": "Зал шаблона; null — глобальный шаблон"
          }
        },
        "required": [
          "name",
          "items"
        ]
      },
      "UpdateAdminWorkoutTemplateDto": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "description": {
            "type": "string",
            "nullable": true
          },
          "items": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/WorkoutTemplateItemDto"
            }
          },
          "gym_id": {
            "type": "object",
            "format": "uuid",
            "nullable": true,
            "description": "Зал шаблона; null — глобальный шаблон"
          }
        }
      },
      "CreateWorkoutTemplateDto": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "description": {
            "type": "string",
            "nullable": true
          },
          "items": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/WorkoutTemplateItemDto"
            }
          }
        },
        "required": [
          "name",
          "items"
        ]
      },
      "UpdateWorkoutTemplateDto": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "description": {
            "type": "string",
            "nullable": true
          },
          "items": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/WorkoutTemplateItemDto"
            }
          }
        }
      },
      "CreateWorkoutDto": {
        "type": "object",
        "properties": {
          "client_id": {
            "type": "string",
            "format": "uuid"
          },
          "gym_id": {
            "type": "string",
            "format": "uuid"
          },
          "date": {
            "type": "string",
            "example": "2026-11-08",
            "format": "date"
          },
          "start_time": {
            "type": "string",
            "example": "18:30",
            "description": "Время старта HH:mm"
          },
          "template_id": {
            "type": "string",
            "format": "uuid",
            "nullable": true
          },
          "comment": {
            "type": "string",
            "nullable": true
          },
          "items": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/WorkoutTemplateItemDto"
            }
          }
        },
        "required": [
          "client_id",
          "gym_id",
          "date",
          "items"
        ]
      },
      "UpdateWorkoutItemResultDto": {
        "type": "object",
        "properties": {
          "done": {
            "type": "boolean"
          },
          "actualWeight": {
            "type": "number",
            "nullable": true,
            "description": "кг"
          },
          "actualReps": {
            "type": "number",
            "nullable": true
          },
          "clientComment": {
            "type": "string",
            "nullable": true
          }
        },
        "required": [
          "done"
        ]
      },
      "CreateNotificationDto": {
        "type": "object",
        "properties": {
          "title": {
            "type": "string"
          },
          "body": {
            "type": "string"
          },
          "gym_id": {
            "type": "string",
            "format": "uuid",
            "nullable": true
          }
        },
        "required": [
          "title",
          "body"
        ]
      },
      "CreateNutritionDto": {
        "type": "object",
        "properties": {
          "client_id": {
            "type": "string",
            "format": "uuid"
          },
          "type": {
            "type": "string",
            "enum": [
              "DAILY",
              "POST_WORKOUT"
            ]
          },
          "kcal": {
            "type": "number",
            "nullable": true
          },
          "protein": {
            "type": "number",
            "nullable": true
          },
          "fat": {
            "type": "number",
            "nullable": true
          },
          "carbs": {
            "type": "number",
            "nullable": true
          },
          "comment": {
            "type": "string",
            "nullable": true
          },
          "validFrom": {
            "type": "string",
            "example": "2026-11-01",
            "format": "date"
          },
          "validTo": {
            "type": "string",
            "example": "2026-11-30",
            "format": "date"
          }
        },
        "required": [
          "client_id",
          "type"
        ]
      },
      "CreateChatDto": {
        "type": "object",
        "properties": {
          "type": {
            "type": "string",
            "enum": [
              "CLIENT_TRAINER",
              "CLIENT_ADMIN",
              "TRAINER_ADMIN"
            ]
          },
          "client_id": {
            "type": "string",
            "format": "uuid"
          },
          "trainer_id": {
            "type": "string",
            "format": "uuid"
          },
          "admin_id": {
            "type": "string",
            "format": "uuid"
          }
        },
        "required": [
          "type"
        ]
      },
      "SendMessageDto": {
        "type": "object",
        "properties": {
          "text": {
            "type": "string",
            "minLength": 1,
            "maxLength": 4000
          }
        },
        "required": [
          "text"
        ]
      },
      "CreateAdministratorDto": {
        "type": "object",
        "properties": {
          "phone": {
            "type": "string",
            "example": "+79990000030"
          },
          "name": {
            "type": "string",
            "example": "Мария Смирнова"
          },
          "gym_id": {
            "type": "string",
            "example": "3f1b0c2e-8f5a-4d6e-9a1b-2c3d4e5f6a7b"
          },
          "password": {
            "type": "string",
            "minLength": 8,
            "maxLength": 72
          }
        },
        "required": [
          "phone",
          "name",
          "gym_id"
        ]
      },
      "UpdateAdministratorDto": {
        "type": "object",
        "properties": {
          "phone": {
            "type": "string",
            "example": "+79990000030"
          },
          "name": {
            "type": "string",
            "example": "Мария Смирнова"
          },
          "gym_id": {
            "type": "string",
            "example": "3f1b0c2e-8f5a-4d6e-9a1b-2c3d4e5f6a7b"
          },
          "password": {
            "type": "string",
            "minLength": 8,
            "maxLength": 72
          }
        }
      },
      "UpdatePhotoDto": {
        "type": "object",
        "properties": {
          "photoUrl": {
            "type": "string",
            "example": "/uploads/photo.jpg"
          }
        },
        "required": [
          "photoUrl"
        ]
      },
      "LinkAdministratorTrainerDto": {
        "type": "object",
        "properties": {
          "trainer_id": {
            "type": "string",
            "example": "3f1b0c2e-8f5a-4d6e-9a1b-2c3d4e5f6a7b"
          }
        },
        "required": [
          "trainer_id"
        ]
      }
    }
  }
}
```
