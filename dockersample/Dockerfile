
# Use the official Python image
FROM mcr.microsoft.com/devcontainers/python:3.12

# Create a non-root user
RUN useradd -m myuser

# Set the working directory
WORKDIR /home/site/wwwroot

# Copy the application code
COPY app/backend /home/site/wwwroot

RUN apt-get update && \
    apt-get install -y libreoffice && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install the dependencies
RUN pip install --no-cache-dir -r /home/site/wwwroot/requirements.txt

# Change ownership of the working directory to the new user
RUN chown -R myuser:myuser /home/site/wwwroot

# Switch to the non-root user
USER myuser

# Expose the port the app runs on
EXPOSE 6000

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "6000"]