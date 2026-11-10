```yaml
openapi: 3.1.0
info:
  title: Gym MVP API
  version: 1.1.0
  description: |
    API спортивного зала: админ (web), тренер (mobile), клиент (mobile).
    Часовой пояс по умолчанию Asia/Novosibirsk, у каждого User своё поле timezone.
    Все DateTime — ISO 8601 UTC. Workout.date — календарная дата (без времени).

servers:
  - url: http://localhost:8080/api/v1

security:
  - bearerAuth: []

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Error:
      type: object
      properties:
        statusCode: { type: integer }
        message: { type: string }
        error: { type: string }

    Role:
      type: string
      enum: [ADMIN, TRAINER, CLIENT]

    Gender:
      type: string
      enum: [MALE, FEMALE, OTHER]

    EquipmentType:
      type: string
      enum: [MACHINE, FREE_WEIGHT, CARDIO, OTHER]

    WorkoutStatus:
      type: string
      enum: [PLANNED, IN_PROGRESS, DONE, SKIPPED]

    NutritionType:
      type: string
      enum: [DAILY, POST_WORKOUT]

    ChatType:
      type: string
      enum: [CLIENT_TRAINER, CLIENT_ADMIN, TRAINER_ADMIN]

    LoginRequest:
      type: object
      required: [phone, password]
      properties:
        phone: { type: string, example: "+79001234567" }
        password: { type: string, format: password }

    TokenResponse:
      type: object
      properties:
        access_token: { type: string }
        refresh_token: { type: string }
        role: { $ref: '#/components/schemas/Role' }
        user_id: { type: string, format: uuid }

    RefreshRequest:
      type: object
      required: [refresh_token]
      properties:
        refresh_token: { type: string }

    MeResponse:
      type: object
      properties:
        user_id: { type: string, format: uuid }
        role: { $ref: '#/components/schemas/Role' }
        name: { type: string }
        phone: { type: string }
        timezone: { type: string, example: "Asia/Novosibirsk" }

    UpdateTimezoneRequest:
      type: object
      required: [timezone]
      properties:
        timezone: { type: string, example: "Europe/Moscow" }

    UpdatePushTokenRequest:
      type: object
      required: [token]
      properties:
        token: { type: string, example: "fcm-registration-token" }

    Gym:
      type: object
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        address: { type: string }
        isActive: { type: boolean }

    CreateGymRequest:
      type: object
      required: [name, address]
      properties:
        name: { type: string }
        address: { type: string }
        isActive: { type: boolean }

    GymEquipment:
      type: object
      properties:
        id: { type: string, format: uuid }
        gymId: { type: string, format: uuid }
        name: { type: string }
        type: { $ref: '#/components/schemas/EquipmentType' }
        minWeight: { type: number, nullable: true }
        maxWeight: { type: number, nullable: true }
        photoUrl: { type: string, nullable: true }
        description: { type: string, nullable: true }

    CreateEquipmentRequest:
      type: object
      required: [name, type]
      properties:
        name: { type: string }
        type: { $ref: '#/components/schemas/EquipmentType' }
        minWeight: { type: number, nullable: true }
        maxWeight: { type: number, nullable: true }
        photoUrl: { type: string, nullable: true }
        description: { type: string, nullable: true }

    Exercise:
      type: object
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        type: { $ref: '#/components/schemas/EquipmentType' }
        muscleGroup: { type: string, nullable: true }
        requiresEquipment: { type: boolean }
        videoUrl: { type: string, nullable: true }
        description: { type: string, nullable: true }

    CreateExerciseRequest:
      type: object
      required: [name, type, requiresEquipment]
      properties:
        name: { type: string }
        type: { $ref: '#/components/schemas/EquipmentType' }
        muscleGroup: { type: string, nullable: true }
        requiresEquipment: { type: boolean }
        videoUrl: { type: string, nullable: true }
        description: { type: string, nullable: true }

    FoodProduct:
      type: object
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        kcal: { type: number }
        protein: { type: number }
        fat: { type: number }
        carbs: { type: number }

    CreateFoodProductRequest:
      type: object
      required: [name, kcal, protein, fat, carbs]
      properties:
        name: { type: string }
        kcal: { type: number, minimum: 0 }
        protein: { type: number, minimum: 0 }
        fat: { type: number, minimum: 0 }
        carbs: { type: number, minimum: 0 }

    ClientTrainerLink:
      type: object
      properties:
        id: { type: string, format: uuid }
        trainerId: { type: string, format: uuid }
        trainerName: { type: string }
        gymId: { type: string, format: uuid }
        gymName: { type: string }
        isActive: { type: boolean }
        assignedAt: { type: string, format: date-time }

    Client:
      type: object
      properties:
        id: { type: string, format: uuid }
        userId: { type: string, format: uuid }
        phone: { type: string }
        name: { type: string }
        gender: { type: string, enum: [MALE, FEMALE, OTHER], nullable: true }
        height: { type: number, nullable: true, description: "см" }
        birthdate: { type: string, format: date, nullable: true }
        age: { type: integer, nullable: true, description: "вычисляется из birthdate" }
        startWeight: { type: number, nullable: true, description: "кг, неизменный" }
        startFatMass: { type: number, nullable: true, description: "%" }
        currentWeight: { type: number, nullable: true, description: "последний замер, кг" }
        currentFatMass: { type: number, nullable: true, description: "последний замер, %" }
        goal: { type: string, nullable: true }
        notes: { type: string, nullable: true }
        active_trainers:
          type: array
          items: { $ref: '#/components/schemas/ClientTrainerLink' }

    CreateClientRequest:
      type: object
      required: [phone, name]
      properties:
        phone: { type: string }
        name: { type: string }
        gender: { type: string, enum: [MALE, FEMALE, OTHER], nullable: true }
        height: { type: number, nullable: true, minimum: 0 }
        birthdate: { type: string, format: date, nullable: true }
        startWeight: { type: number, nullable: true, minimum: 0 }
        startFatMass: { type: number, nullable: true, minimum: 0, maximum: 100 }
        goal: { type: string, nullable: true }
        notes: { type: string, nullable: true }

    CreateClientResponse:
      allOf:
        - $ref: '#/components/schemas/Client'
        - type: object
          properties:
            initial_password: { type: string }

    CreateTrainerRequest:
      type: object
      required: [phone, name]
      properties:
        phone: { type: string }
        name: { type: string }

    Trainer:
      type: object
      properties:
        id: { type: string, format: uuid }
        userId: { type: string, format: uuid }
        phone: { type: string }
        name: { type: string }

    CreateTrainerResponse:
      allOf:
        - $ref: '#/components/schemas/Trainer'
        - type: object
          properties:
            initial_password: { type: string }

    LinkTrainerRequest:
      type: object
      required: [trainer_id, gym_id]
      properties:
        trainer_id: { type: string, format: uuid }
        gym_id: { type: string, format: uuid }

    WeightMeasurement:
      type: object
      properties:
        id: { type: string, format: uuid }
        clientId: { type: string, format: uuid }
        measuredBy: { type: string, format: uuid }
        measuredAt: { type: string, format: date-time }
        weight: { type: number, description: "кг" }
        fatMass: { type: number, nullable: true, description: "%" }
        comment: { type: string, nullable: true }
        createdAt: { type: string, format: date-time }

    CreateWeightMeasurementRequest:
      type: object
      required: [weight, measuredAt]
      properties:
        weight: { type: number, minimum: 0 }
        fatMass: { type: number, nullable: true, minimum: 0, maximum: 100 }
        measuredAt: { type: string, format: date-time }
        comment: { type: string, nullable: true }

    WeightDynamicsPoint:
      type: object
      properties:
        measuredAt: { type: string, format: date-time }
        weight: { type: number }
        fatMass: { type: number, nullable: true }

    ExerciseProgressPoint:
      type: object
      properties:
        date: { type: string, format: date }
        plannedWeight: { type: number, nullable: true }
        actualWeight: { type: number, description: "если факт не введён — равен plannedWeight" }
        plannedReps: { type: integer }
        actualReps: { type: integer, description: "если факт не введён — равен plannedReps" }
        done: { type: boolean }
        isActualFallback: { type: boolean, description: "true = факт не введён, взят из плана" }

    ExerciseProgressResponse:
      type: object
      properties:
        exercise: { $ref: '#/components/schemas/Exercise' }
        points:
          type: array
          items: { $ref: '#/components/schemas/ExerciseProgressPoint' }

    ExerciseSummaryItem:
      type: object
      properties:
        exerciseId: { type: string, format: uuid }
        exerciseName: { type: string }
        firstWeight: { type: number, nullable: true }
        lastWeight: { type: number, nullable: true }
        recordsCount: { type: integer }

    WorkoutTemplateItem:
      type: object
      properties:
        exerciseId: { type: string, format: uuid }
        equipmentId: { type: string, format: uuid, nullable: true }
        plannedWeight: { type: number, nullable: true }
        plannedSets: { type: integer }
        plannedReps: { type: integer }
        restSec: { type: integer, nullable: true }
        order: { type: integer }

    WorkoutTemplate:
      type: object
      properties:
        id: { type: string, format: uuid }
        trainerId: { type: string, format: uuid }
        name: { type: string }
        description: { type: string, nullable: true }
        items:
          type: array
          items: { $ref: '#/components/schemas/WorkoutTemplateItem' }

    WorkoutItemResult:
      type: object
      properties:
        done: { type: boolean }
        actualWeight: { type: number, nullable: true }
        actualReps: { type: integer, nullable: true }
        clientComment: { type: string, nullable: true }
        updatedAt: { type: string, format: date-time }

    WorkoutItem:
      type: object
      properties:
        id: { type: string, format: uuid }
        exercise: { $ref: '#/components/schemas/Exercise' }
        gymEquipment: { $ref: '#/components/schemas/GymEquipment' }
        plannedWeight: { type: number, nullable: true }
        plannedSets: { type: integer }
        plannedReps: { type: integer }
        order: { type: integer }
        result: { $ref: '#/components/schemas/WorkoutItemResult' }

    Workout:
      type: object
      properties:
        id: { type: string, format: uuid }
        clientId: { type: string, format: uuid }
        trainerId: { type: string, format: uuid }
        gymId: { type: string, format: uuid }
        date: { type: string, format: date }
        status: { $ref: '#/components/schemas/WorkoutStatus' }
        comment: { type: string, nullable: true }
        templateId: { type: string, format: uuid, nullable: true }
        items:
          type: array
          items: { $ref: '#/components/schemas/WorkoutItem' }

    CreateWorkoutRequest:
      type: object
      required: [client_id, gym_id, date, items]
      properties:
        client_id: { type: string, format: uuid }
        gym_id: { type: string, format: uuid }
        date: { type: string, format: date }
        template_id: { type: string, format: uuid, nullable: true }
        comment: { type: string, nullable: true }
        items:
          type: array
          items: { $ref: '#/components/schemas/WorkoutTemplateItem' }

    UpdateWorkoutItemResultRequest:
      type: object
      required: [done]
      properties:
        done: { type: boolean }
        actualWeight: { type: number, nullable: true }
        actualReps: { type: integer, nullable: true }
        clientComment: { type: string, nullable: true }

    NutritionRecommendation:
      type: object
      properties:
        id: { type: string, format: uuid }
        clientId: { type: string, format: uuid }
        trainerId: { type: string, format: uuid }
        type: { $ref: '#/components/schemas/NutritionType' }
        kcal: { type: number, nullable: true }
        protein: { type: number, nullable: true }
        fat: { type: number, nullable: true }
        carbs: { type: number, nullable: true }
        comment: { type: string, nullable: true }
        validFrom: { type: string, format: date, nullable: true }
        validTo: { type: string, format: date, nullable: true }

    CreateNutritionRequest:
      type: object
      required: [client_id, type]
      properties:
        client_id: { type: string, format: uuid }
        type: { $ref: '#/components/schemas/NutritionType' }
        kcal: { type: number, nullable: true }
        protein: { type: number, nullable: true }
        fat: { type: number, nullable: true }
        carbs: { type: number, nullable: true }
        comment: { type: string, nullable: true }
        validFrom: { type: string, format: date, nullable: true }
        validTo: { type: string, format: date, nullable: true }

    Chat:
      type: object
      properties:
        id: { type: string, format: uuid }
        type: { $ref: '#/components/schemas/ChatType' }
        peerId: { type: string, format: uuid }
        peerName: { type: string }
        lastMessage: { type: string, nullable: true }
        unreadCount: { type: integer }

    Message:
      type: object
      properties:
        id: { type: string, format: uuid }
        chatId: { type: string, format: uuid }
        senderId: { type: string, format: uuid }
        text: { type: string }
        attachmentUrl: { type: string, nullable: true }
        createdAt: { type: string, format: date-time }
        readAt: { type: string, format: date-time, nullable: true }

    SendMessageRequest:
      type: object
      required: [text]
      properties:
        text: { type: string, minLength: 1 }

    Notification:
      type: object
      properties:
        id: { type: string, format: uuid }
        gymId: { type: string, format: uuid, nullable: true }
        title: { type: string }
        body: { type: string }
        senderId: { type: string, format: uuid }
        createdAt: { type: string, format: date-time }
        readAt: { type: string, format: date-time, nullable: true }

    CreateNotificationRequest:
      type: object
      required: [title, body]
      properties:
        title: { type: string }
        body: { type: string }
        gym_id:
          type: string
          format: uuid
          nullable: true
          description: "если задан — broadcast клиентам с активной связью в этом зале"

paths:
  /health:
    get:
      security: []
      tags: [system]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  status: { type: string, example: ok }

  /auth/login:
    post:
      security: []
      tags: [auth]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/LoginRequest' }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/TokenResponse' }
        '401':
          description: Unauthorized
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Error' }

  /auth/refresh:
    post:
      security: []
      tags: [auth]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/RefreshRequest' }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/TokenResponse' }
        '401':
          description: Unauthorized

  /auth/me:
    get:
      tags: [auth]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/MeResponse' }

  /auth/timezone:
    patch:
      tags: [auth]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/UpdateTimezoneRequest' }
      responses:
        '204': { description: No Content }
        '400': { description: Invalid timezone }

  /auth/push-token:
    patch:
      tags: [auth]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/UpdatePushTokenRequest' }
      responses:
        '204': { description: No Content }
        '400': { description: Invalid token }

  # ---------- ADMIN: gyms ----------
  /admin/gyms:
    get:
      tags: [admin]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Gym' }
    post:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateGymRequest' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Gym' }

  /admin/gyms/{id}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    get:
      tags: [admin]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Gym' }
        '404': { description: Not Found }
    put:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateGymRequest' }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Gym' }
    delete:
      tags: [admin]
      responses:
        '204': { description: Deleted }
        '409': { description: "Conflict: есть тренажёры" }

  # ---------- ADMIN: equipment ----------
  /admin/gyms/{gymId}/equipment:
    parameters:
      - { name: gymId, in: path, required: true, schema: { type: string, format: uuid } }
    get:
      tags: [admin]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/GymEquipment' }
    post:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateEquipmentRequest' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/GymEquipment' }
        '400': { description: "minWeight > maxWeight" }

  /admin/equipment/{id}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    put:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateEquipmentRequest' }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/GymEquipment' }
    delete:
      tags: [admin]
      responses:
        '204': { description: Deleted }

  # ---------- ADMIN: exercises ----------
  /admin/exercises:
    get:
      tags: [admin]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Exercise' }
    post:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateExerciseRequest' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Exercise' }

  /admin/exercises/{id}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    put:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateExerciseRequest' }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Exercise' }
    delete:
      tags: [admin]
      responses:
        '204': { description: Deleted }

  # ---------- PUBLIC (JWT): exercises, gyms equipment ----------
  /exercises:
    get:
      tags: [shared]
      parameters:
        - { name: type, in: query, schema: { $ref: '#/components/schemas/EquipmentType' } }
        - { name: muscle_group, in: query, schema: { type: string } }
        - { name: q, in: query, schema: { type: string } }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Exercise' }

  /gyms:
    get:
      tags: [shared]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Gym' }

  /gyms/{gymId}/equipment:
    parameters:
      - { name: gymId, in: path, required: true, schema: { type: string, format: uuid } }
    get:
      tags: [shared]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/GymEquipment' }

  # ---------- ADMIN: food-products ----------
  /admin/food-products:
    get:
      tags: [admin]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/FoodProduct' }
    post:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateFoodProductRequest' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/FoodProduct' }

  /admin/food-products/{id}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    put:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateFoodProductRequest' }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/FoodProduct' }
    delete:
      tags: [admin]
      responses:
        '204': { description: Deleted }

  # ---------- ADMIN: clients + trainers ----------
  /admin/clients:
    get:
      tags: [admin]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Client' }
    post:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateClientRequest' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/CreateClientResponse' }
        '409': { description: Phone already exists }

  /admin/clients/{id}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    put:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateClientRequest' }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Client' }
    delete:
      tags: [admin]
      responses:
        '204': { description: Deleted }

  /admin/clients/{id}/trainers:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    post:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/LinkTrainerRequest' }
      responses:
        '201': { description: Created }
        '409': { description: Link already exists }

  /admin/clients/{id}/trainers/{linkId}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
      - { name: linkId, in: path, required: true, schema: { type: string, format: uuid } }
    delete:
      tags: [admin]
      responses:
        '204': { description: Deactivated }

  /admin/trainers:
    get:
      tags: [admin]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Trainer' }
    post:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateTrainerRequest' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/CreateTrainerResponse' }
        '409': { description: Phone already exists }

  /admin/trainers/{id}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    put:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateTrainerRequest' }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Trainer' }
    delete:
      tags: [admin]
      responses:
        '204': { description: Deleted }

  # ---------- ADMIN: upload ----------
  /admin/upload:
    post:
      tags: [admin]
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required: [file]
              properties:
                file:
                  type: string
                  format: binary
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                type: object
                properties:
                  url: { type: string, example: "/uploads/uuid.png" }
        '400': { description: Invalid file }

  # ---------- ADMIN: notifications ----------
  /admin/notifications:
    post:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateNotificationRequest' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Notification' }

  # ---------- WEIGHT MEASUREMENTS (trainer) ----------
  /client/{id}/weight-measurements:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    get:
      tags: [trainer]
      summary: История замеров клиента (только тренер при активной связи)
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/WeightMeasurement' }
        '403': { description: Trainer not linked to client }
        '404': { description: Client not found }
    post:
      tags: [trainer]
      summary: Добавить замер (только тренер при активной связи)
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateWeightMeasurementRequest' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/WeightMeasurement' }
        '400': { description: Validation error }
        '403': { description: Trainer not linked }
        '404': { description: Client not found }

  # ---------- REPORTS ----------
  /reports/weight-dynamics:
    get:
      tags: [client, trainer]
      summary: Динамика веса и жира
      parameters:
        - { name: client_id, in: query, required: false, schema: { type: string, format: uuid },
            description: "обязателен для trainer и admin; клиент игнорирует" }
        - { name: from, in: query, required: false, schema: { type: string, format: date } }
        - { name: to, in: query, required: false, schema: { type: string, format: date } }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/WeightDynamicsPoint' }
        '403': { description: Trainer not linked }

  /reports/exercise-progress:
    get:
      tags: [client, trainer]
      summary: Прогресс по упражнению (план vs факт, с fallback)
      parameters:
        - { name: client_id, in: query, required: false, schema: { type: string, format: uuid } }
        - { name: exercise_id, in: query, required: true, schema: { type: string, format: uuid } }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ExerciseProgressResponse' }
        '400': { description: exercise_id required }
        '403': { description: Trainer not linked }
        '404': { description: Exercise not found }

  /reports/exercises-summary:
    get:
      tags: [client, trainer]
      summary: Список упражнений, по которым есть история
      parameters:
        - { name: client_id, in: query, required: false, schema: { type: string, format: uuid } }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/ExerciseSummaryItem' }

  # ---------- TRAINER: workouts + nutrition ----------
  /trainer/clients:
    get:
      tags: [trainer]
      summary: Мои клиенты (активная связь)
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Client' }

  /trainer/templates:
    get:
      tags: [trainer]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/WorkoutTemplate' }
    post:
      tags: [trainer]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/WorkoutTemplate' }
      responses:
        '201': { description: Created }

  /trainer/workouts:
    post:
      tags: [trainer]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateWorkoutRequest' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Workout' }

  /trainer/workouts/{id}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    put:
      tags: [trainer]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateWorkoutRequest' }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Workout' }

  /trainer/nutrition:
    get:
      tags: [trainer]
      parameters:
        - { name: client_id, in: query, required: true, schema: { type: string, format: uuid } }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/NutritionRecommendation' }
        '403':
          description: Trainer не привязан к клиенту
    post:
      tags: [trainer]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateNutritionRequest' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/NutritionRecommendation' }

  # ---------- CLIENT ----------
  /client/workouts:
    get:
      tags: [client]
      parameters:
        - { name: from, in: query, required: true, schema: { type: string, format: date } }
        - { name: to, in: query, required: true, schema: { type: string, format: date } }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Workout' }

  /client/workouts/{id}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    get:
      tags: [client]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Workout' }

  /client/workout-items/{id}/result:
    put:
      tags: [client]
      parameters:
        - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/UpdateWorkoutItemResultRequest' }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/WorkoutItemResult' }

  /client/nutrition:
    get:
      tags: [client]
      parameters:
        - { name: date, in: query, required: false, schema: { type: string, format: date } }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/NutritionRecommendation' }

  # ---------- CHATS ----------
  /chats:
    get:
      tags: [shared]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Chat' }

  /chats/{id}/messages:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    get:
      tags: [shared]
      parameters:
        - { name: before, in: query, required: false, schema: { type: string, format: date-time } }
        - { name: limit, in: query, required: false, schema: { type: integer, default: 50 } }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Message' }
    post:
      tags: [shared]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/SendMessageRequest' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Message' }

  # ---------- NOTIFICATIONS (получатель) ----------
  /notifications:
    get:
      tags: [shared]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Notification' }

  /notifications/{id}/read:
    post:
      tags: [shared]
      parameters:
        - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
      responses:
        '204': { description: Marked as read }
```