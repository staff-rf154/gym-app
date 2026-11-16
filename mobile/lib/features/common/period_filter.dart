import 'package:flutter/material.dart';

import '../client/client_workout_models.dart';

class PeriodFilter extends StatelessWidget {
  const PeriodFilter({
    super.key,
    required this.value,
    required this.onChanged,
    this.label = 'Период',
  });

  final WorkoutPeriod value;
  final ValueChanged<WorkoutPeriod> onChanged;
  final String label;

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<WorkoutPeriod>(
      initialValue: value,
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
        isDense: true,
      ),
      items: [
        for (final period in WorkoutPeriod.values)
          DropdownMenuItem(
            value: period,
            child: Text(workoutPeriodLabel(period)),
          ),
      ],
      onChanged: (period) {
        if (period != null) {
          onChanged(period);
        }
      },
    );
  }
}
